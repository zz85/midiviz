import{a as mo}from"./chunk-WOT6VMZA.js";import{PerspectiveCamera as ho}from"three";var Fn=class extends ho{set bokehSize(t){this.fStop=this.getFocalLength()/t}get bokehSize(){return this.getFocalLength()/this.fStop}constructor(...t){super(...t),this.fStop=1.4,this.apertureBlades=0,this.apertureRotation=0,this.focusDistance=25,this.anamorphicRatio=1}copy(t,e){return super.copy(t,e),this.fStop=t.fStop,this.apertureBlades=t.apertureBlades,this.apertureRotation=t.apertureRotation,this.focusDistance=t.focusDistance,this.anamorphicRatio=t.anamorphicRatio,this}};import{Camera as xo}from"three";var Dn=class extends xo{constructor(){super(),this.isEquirectCamera=!0}};import{BufferAttribute as sr,FrontSide as Ti,Ray as cr,Vector3 as _i,Matrix4 as ar}from"three";var St=Math.pow(2,-24),at=Symbol("SKIP_GENERATION"),ce={strategy:0,maxDepth:40,targetLeafSize:10,useSharedArrayBuffer:!1,setBoundingBox:!0,onProgress:null,indirect:!1,verbose:!0,range:null,[at]:!1};import{Vector3 as lt,Matrix4 as Ln,Line3 as Cn}from"three";import{Vector3 as yo}from"three";var K=class{constructor(){this.min=1/0,this.max=-1/0}setFromPointsField(t,e){let n=1/0,i=-1/0;for(let s=0,o=t.length;s<o;s++){let f=t[s][e];n=f<n?f:n,i=f>i?f:i}this.min=n,this.max=i}setFromPoints(t,e){let n=1/0,i=-1/0;for(let s=0,o=e.length;s<o;s++){let c=e[s],f=t.dot(c);n=f<n?f:n,i=f>i?f:i}this.min=n,this.max=i}isSeparated(t){return this.min>t.max||t.min>this.max}};K.prototype.setFromBox=(function(){let r=new yo;return function(e,n){let i=n.min,s=n.max,o=1/0,c=-1/0;for(let f=0;f<=1;f++)for(let p=0;p<=1;p++)for(let u=0;u<=1;u++){r.x=i.x*f+s.x*(1-f),r.y=i.y*p+s.y*(1-p),r.z=i.z*u+s.z*(1-u);let a=e.dot(r);o=Math.min(a,o),c=Math.max(a,c)}this.min=o,this.max=c}})();import{Triangle as Ao,Vector3 as Q,Vector2 as Mn,Line3 as _t,Plane as bo}from"three";import{Vector3 as yt,Vector2 as go,Plane as vo,Line3 as To}from"three";var wo=(function(){let r=new yt,t=new yt,e=new yt;return function(i,s,o){let c=i.start,f=r,p=s.start,u=t;e.subVectors(c,p),r.subVectors(i.end,i.start),t.subVectors(s.end,s.start);let a=e.dot(u),l=u.dot(f),d=u.dot(u),h=e.dot(f),g=f.dot(f)*d-l*l,v,m;g!==0?v=(a*l-h*d)/g:v=0,m=(a+v*l)/d,o.x=v,o.y=m}})(),qt=(function(){let r=new go,t=new yt,e=new yt;return function(i,s,o,c){wo(i,s,r);let f=r.x,p=r.y;if(f>=0&&f<=1&&p>=0&&p<=1){i.at(f,o),s.at(p,c);return}else if(f>=0&&f<=1){p<0?s.at(0,c):s.at(1,c),i.closestPointToPoint(c,!0,o);return}else if(p>=0&&p<=1){f<0?i.at(0,o):i.at(1,o),s.closestPointToPoint(o,!0,c);return}else{let u;f<0?u=i.start:u=i.end;let a;p<0?a=s.start:a=s.end;let l=t,d=e;if(i.closestPointToPoint(a,!0,t),s.closestPointToPoint(u,!0,e),l.distanceToSquared(a)<=d.distanceToSquared(u)){o.copy(l),c.copy(a);return}else{o.copy(u),c.copy(d);return}}}})(),Nn=(function(){let r=new yt,t=new yt,e=new vo,n=new To;return function(s,o){let{radius:c,center:f}=s,{a:p,b:u,c:a}=o;if(n.start=p,n.end=u,n.closestPointToPoint(f,!0,r).distanceTo(f)<=c||(n.start=p,n.end=a,n.closestPointToPoint(f,!0,r).distanceTo(f)<=c)||(n.start=u,n.end=a,n.closestPointToPoint(f,!0,r).distanceTo(f)<=c))return!0;let w=o.getPlane(e);if(Math.abs(w.distanceToPoint(f))<=c){let v=w.projectPoint(f,t);if(o.containsPoint(v))return!0}return!1}})();var So=["x","y","z"],rt=1e-15,Rn=rt*rt;function Z(r){return Math.abs(r)<rt}var q=class extends Ao{constructor(...t){super(...t),this.isExtendedTriangle=!0,this.satAxes=new Array(4).fill().map(()=>new Q),this.satBounds=new Array(4).fill().map(()=>new K),this.points=[this.a,this.b,this.c],this.plane=new bo,this.isDegenerateIntoSegment=!1,this.isDegenerateIntoPoint=!1,this.degenerateSegment=new _t,this.needsUpdate=!0}intersectsSphere(t){return Nn(t,this)}update(){let t=this.a,e=this.b,n=this.c,i=this.points,s=this.satAxes,o=this.satBounds,c=s[0],f=o[0];this.getNormal(c),f.setFromPoints(c,i);let p=s[1],u=o[1];p.subVectors(t,e),u.setFromPoints(p,i);let a=s[2],l=o[2];a.subVectors(e,n),l.setFromPoints(a,i);let d=s[3],h=o[3];d.subVectors(n,t),h.setFromPoints(d,i);let w=p.length(),g=a.length(),v=d.length();this.isDegenerateIntoPoint=!1,this.isDegenerateIntoSegment=!1,w<rt?g<rt||v<rt?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(t),this.degenerateSegment.end.copy(n)):g<rt?v<rt?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(e),this.degenerateSegment.end.copy(t)):v<rt&&(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(n),this.degenerateSegment.end.copy(e)),this.plane.setFromNormalAndCoplanarPoint(c,t),this.needsUpdate=!1}};q.prototype.closestPointToSegment=(function(){let r=new Q,t=new Q,e=new _t;return function(i,s=null,o=null){this.needsUpdate&&this.update();let{start:c,end:f}=i,p=this.points,u,a=1/0,l=this.plane.distanceToPoint(c),d=this.plane.distanceToPoint(f);if(l*d<0&&this.plane.intersectLine(i,r)!==null&&this.containsPoint(r))return s&&s.copy(r),o&&o.copy(r),0;for(let h=0;h<3;h++){let w=(h+1)%3;e.start.copy(p[h]),e.end.copy(p[w]),qt(e,i,r,t),u=r.distanceToSquared(t),u<a&&(a=u,s&&s.copy(r),o&&o.copy(t))}return this.closestPointToPoint(c,r),u=c.distanceToSquared(r),u<a&&(a=u,s&&s.copy(r),o&&o.copy(c)),this.closestPointToPoint(f,r),u=f.distanceToSquared(r),u<a&&(a=u,s&&s.copy(r),o&&o.copy(f)),Math.sqrt(a)}})();q.prototype.intersectsTriangle=(function(){let r=new q,t=new K,e=new K,n=new Q,i=new Q,s=new Q,o=new Q,c=new _t,f=new _t,p=new Q,u=new Mn,a=new Mn;function l(y,x,T,_){let A=n;!y.isDegenerateIntoPoint&&!y.isDegenerateIntoSegment?A.copy(y.plane.normal):A.copy(x.plane.normal);let P=y.satBounds,I=y.satAxes;for(let b=1;b<4;b++){let E=P[b],F=I[b];if(t.setFromPoints(F,x.points),E.isSeparated(t)||(o.copy(A).cross(F),t.setFromPoints(o,y.points),e.setFromPoints(o,x.points),t.isSeparated(e)))return!1}let S=x.satBounds,B=x.satAxes;for(let b=1;b<4;b++){let E=S[b],F=B[b];if(t.setFromPoints(F,y.points),E.isSeparated(t)||(o.crossVectors(A,F),t.setFromPoints(o,y.points),e.setFromPoints(o,x.points),t.isSeparated(e)))return!1}return T&&(_||console.warn("ExtendedTriangle.intersectsTriangle: Triangles are coplanar which does not support an output edge. Setting edge to 0, 0, 0."),T.start.set(0,0,0),T.end.set(0,0,0)),!0}function d(y,x,T,_,A,P,I,S,B,b,E){let F=I/(I-S);b.x=_+(A-_)*F,E.start.subVectors(x,y).multiplyScalar(F).add(y),F=I/(I-B),b.y=_+(P-_)*F,E.end.subVectors(T,y).multiplyScalar(F).add(y)}function h(y,x,T,_,A,P,I,S,B,b,E){if(A>0)d(y.c,y.a,y.b,_,x,T,B,I,S,b,E);else if(P>0)d(y.b,y.a,y.c,T,x,_,S,I,B,b,E);else if(S*B>0||I!=0)d(y.a,y.b,y.c,x,T,_,I,S,B,b,E);else if(S!=0)d(y.b,y.a,y.c,T,x,_,S,I,B,b,E);else if(B!=0)d(y.c,y.a,y.b,_,x,T,B,I,S,b,E);else return!0;return!1}function w(y,x,T,_){let A=x.degenerateSegment,P=y.plane.distanceToPoint(A.start),I=y.plane.distanceToPoint(A.end);return Z(P)?Z(I)?l(y,x,T,_):(T&&(T.start.copy(A.start),T.end.copy(A.start)),y.containsPoint(A.start)):Z(I)?(T&&(T.start.copy(A.end),T.end.copy(A.end)),y.containsPoint(A.end)):y.plane.intersectLine(A,n)!=null?(T&&(T.start.copy(n),T.end.copy(n)),y.containsPoint(n)):!1}function g(y,x,T){let _=x.a;return Z(y.plane.distanceToPoint(_))&&y.containsPoint(_)?(T&&(T.start.copy(_),T.end.copy(_)),!0):!1}function v(y,x,T){let _=y.degenerateSegment,A=x.a;return _.closestPointToPoint(A,!0,n),A.distanceToSquared(n)<Rn?(T&&(T.start.copy(A),T.end.copy(A)),!0):!1}function m(y,x,T,_){if(y.isDegenerateIntoSegment)if(x.isDegenerateIntoSegment){let A=y.degenerateSegment,P=x.degenerateSegment,I=i,S=s;A.delta(I),P.delta(S);let B=n.subVectors(P.start,A.start),b=I.x*S.y-I.y*S.x;if(Z(b))return!1;let E=(B.x*S.y-B.y*S.x)/b,F=-(I.x*B.y-I.y*B.x)/b;if(E<0||E>1||F<0||F>1)return!1;let D=A.start.z+I.z*E,z=P.start.z+S.z*F;return Z(D-z)?(T&&(T.start.copy(A.start).addScaledVector(I,E),T.end.copy(A.start).addScaledVector(I,E)),!0):!1}else return x.isDegenerateIntoPoint?v(y,x,T):w(x,y,T,_);else{if(y.isDegenerateIntoPoint)return x.isDegenerateIntoPoint?x.a.distanceToSquared(y.a)<Rn?(T&&(T.start.copy(y.a),T.end.copy(y.a)),!0):!1:x.isDegenerateIntoSegment?v(x,y,T):g(x,y,T);if(x.isDegenerateIntoPoint)return g(y,x,T);if(x.isDegenerateIntoSegment)return w(y,x,T,_)}}return function(x,T=null,_=!1){this.needsUpdate&&this.update(),x.isExtendedTriangle?x.needsUpdate&&x.update():(r.copy(x),r.update(),x=r);let A=m(this,x,T,_);if(A!==void 0)return A;let P=this.plane,I=x.plane,S=I.distanceToPoint(this.a),B=I.distanceToPoint(this.b),b=I.distanceToPoint(this.c);Z(S)&&(S=0),Z(B)&&(B=0),Z(b)&&(b=0);let E=S*B,F=S*b;if(E>0&&F>0)return!1;let D=P.distanceToPoint(x.a),z=P.distanceToPoint(x.b),ct=P.distanceToPoint(x.c);Z(D)&&(D=0),Z(z)&&(z=0),Z(ct)&&(ct=0);let Ht=D*z,kt=D*ct;if(Ht>0&&kt>0)return!1;i.copy(P.normal),s.copy(I.normal);let qe=i.cross(s),Ge=0,We=Math.abs(qe.x),En=Math.abs(qe.y);En>We&&(We=En,Ge=1),Math.abs(qe.z)>We&&(Ge=2);let bt=So[Ge],co=this.a[bt],ao=this.b[bt],lo=this.c[bt],fo=x.a[bt],uo=x.b[bt],po=x.c[bt];if(h(this,co,ao,lo,E,F,S,B,b,u,c))return l(this,x,T,_);if(h(x,fo,uo,po,Ht,kt,D,z,ct,a,f))return l(this,x,T,_);if(u.y<u.x){let Ye=u.y;u.y=u.x,u.x=Ye,p.copy(c.start),c.start.copy(c.end),c.end.copy(p)}if(a.y<a.x){let Ye=a.y;a.y=a.x,a.x=Ye,p.copy(f.start),f.start.copy(f.end),f.end.copy(p)}return u.y<a.x||a.y<u.x?!1:(T&&(a.x>u.x?T.start.copy(f.start):T.start.copy(c.start),a.y<u.y?T.end.copy(f.end):T.end.copy(c.end)),!0)}})();q.prototype.distanceToPoint=(function(){let r=new Q;return function(e){return this.closestPointToPoint(e,r),e.distanceTo(r)}})();q.prototype.distanceToTriangle=(function(){let r=new Q,t=new Q,e=["a","b","c"],n=new _t,i=new _t;return function(o,c=null,f=null){let p=c||f?n:null;if(this.intersectsTriangle(o,p,!0))return(c||f)&&(c&&p.getCenter(c),f&&p.getCenter(f)),0;let u=1/0;for(let a=0;a<3;a++){let l,d=e[a],h=o[d];this.closestPointToPoint(h,r),l=h.distanceToSquared(r),l<u&&(u=l,c&&c.copy(r),f&&f.copy(h));let w=this[d];o.closestPointToPoint(w,r),l=w.distanceToSquared(r),l<u&&(u=l,c&&c.copy(w),f&&f.copy(r))}for(let a=0;a<3;a++){let l=e[a],d=e[(a+1)%3];n.set(this[l],this[d]);for(let h=0;h<3;h++){let w=e[h],g=e[(h+1)%3];i.set(o[w],o[g]),qt(n,i,r,t);let v=r.distanceToSquared(t);v<u&&(u=v,c&&c.copy(r),f&&f.copy(t))}}return Math.sqrt(u)}})();var H=class{constructor(t,e,n){this.isOrientedBox=!0,this.min=new lt,this.max=new lt,this.matrix=new Ln,this.invMatrix=new Ln,this.points=new Array(8).fill().map(()=>new lt),this.satAxes=new Array(3).fill().map(()=>new lt),this.satBounds=new Array(3).fill().map(()=>new K),this.alignedSatBounds=new Array(3).fill().map(()=>new K),this.needsUpdate=!1,t&&this.min.copy(t),e&&this.max.copy(e),n&&this.matrix.copy(n)}set(t,e,n){this.min.copy(t),this.max.copy(e),this.matrix.copy(n),this.needsUpdate=!0}copy(t){this.min.copy(t.min),this.max.copy(t.max),this.matrix.copy(t.matrix),this.needsUpdate=!0}};H.prototype.update=(function(){return function(){let t=this.matrix,e=this.min,n=this.max,i=this.points;for(let p=0;p<=1;p++)for(let u=0;u<=1;u++)for(let a=0;a<=1;a++){let l=1*p|2*u|4*a,d=i[l];d.x=p?n.x:e.x,d.y=u?n.y:e.y,d.z=a?n.z:e.z,d.applyMatrix4(t)}let s=this.satBounds,o=this.satAxes,c=i[0];for(let p=0;p<3;p++){let u=o[p],a=s[p],l=1<<p,d=i[l];u.subVectors(c,d),a.setFromPoints(u,i)}let f=this.alignedSatBounds;f[0].setFromPointsField(i,"x"),f[1].setFromPointsField(i,"y"),f[2].setFromPointsField(i,"z"),this.invMatrix.copy(this.matrix).invert(),this.needsUpdate=!1}})();H.prototype.intersectsBox=(function(){let r=new K;return function(e){this.needsUpdate&&this.update();let n=e.min,i=e.max,s=this.satBounds,o=this.satAxes,c=this.alignedSatBounds;if(r.min=n.x,r.max=i.x,c[0].isSeparated(r)||(r.min=n.y,r.max=i.y,c[1].isSeparated(r))||(r.min=n.z,r.max=i.z,c[2].isSeparated(r)))return!1;for(let f=0;f<3;f++){let p=o[f],u=s[f];if(r.setFromBox(p,e),u.isSeparated(r))return!1}return!0}})();H.prototype.intersectsTriangle=(function(){let r=new q,t=new Array(3),e=new K,n=new K,i=new lt;return function(o){this.needsUpdate&&this.update(),o.isExtendedTriangle?o.needsUpdate&&o.update():(r.copy(o),r.update(),o=r);let c=this.satBounds,f=this.satAxes;t[0]=o.a,t[1]=o.b,t[2]=o.c;for(let l=0;l<3;l++){let d=c[l],h=f[l];if(e.setFromPoints(h,t),d.isSeparated(e))return!1}let p=o.satBounds,u=o.satAxes,a=this.points;for(let l=0;l<3;l++){let d=p[l],h=u[l];if(e.setFromPoints(h,a),d.isSeparated(e))return!1}for(let l=0;l<3;l++){let d=f[l];for(let h=0;h<4;h++){let w=u[h];if(i.crossVectors(d,w),e.setFromPoints(i,t),n.setFromPoints(i,a),e.isSeparated(n))return!1}}return!0}})();H.prototype.closestPointToPoint=(function(){return function(t,e){return this.needsUpdate&&this.update(),e.copy(t).applyMatrix4(this.invMatrix).clamp(this.min,this.max).applyMatrix4(this.matrix),e}})();H.prototype.distanceToPoint=(function(){let r=new lt;return function(e){return this.closestPointToPoint(e,r),e.distanceTo(r)}})();H.prototype.distanceToBox=(function(){let r=["x","y","z"],t=new Array(12).fill().map(()=>new Cn),e=new Array(12).fill().map(()=>new Cn),n=new lt,i=new lt;return function(o,c=0,f=null,p=null){if(this.needsUpdate&&this.update(),this.intersectsBox(o))return(f||p)&&(o.getCenter(i),this.closestPointToPoint(i,n),o.closestPointToPoint(n,i),f&&f.copy(n),p&&p.copy(i)),0;let u=c*c,a=o.min,l=o.max,d=this.points,h=1/0;for(let g=0;g<8;g++){let v=d[g];i.copy(v).clamp(a,l);let m=v.distanceToSquared(i);if(m<h&&(h=m,f&&f.copy(v),p&&p.copy(i),m<u))return Math.sqrt(m)}let w=0;for(let g=0;g<3;g++)for(let v=0;v<=1;v++)for(let m=0;m<=1;m++){let y=(g+1)%3,x=(g+2)%3,T=v<<y|m<<x,_=1<<g|v<<y|m<<x,A=d[T],P=d[_];t[w].set(A,P);let S=r[g],B=r[y],b=r[x],E=e[w],F=E.start,D=E.end;F[S]=a[S],F[B]=v?a[B]:l[B],F[b]=m?a[b]:l[b],D[S]=l[S],D[B]=v?a[B]:l[B],D[b]=m?a[b]:l[b],w++}for(let g=0;g<=1;g++)for(let v=0;v<=1;v++)for(let m=0;m<=1;m++){i.x=g?l.x:a.x,i.y=v?l.y:a.y,i.z=m?l.z:a.z,this.closestPointToPoint(i,n);let y=i.distanceToSquared(n);if(y<h&&(h=y,f&&f.copy(n),p&&p.copy(i),y<u))return Math.sqrt(y)}for(let g=0;g<12;g++){let v=t[g];for(let m=0;m<12;m++){let y=e[m];qt(v,y,n,i);let x=n.distanceToSquared(i);if(x<h&&(h=x,f&&f.copy(n),p&&p.copy(i),x<u))return Math.sqrt(x)}}return Math.sqrt(h)}})();var ft=class{constructor(t){this._getNewPrimitive=t,this._primitives=[]}getPrimitive(){let t=this._primitives;return t.length===0?this._getNewPrimitive():t.pop()}releasePrimitive(t){this._primitives.push(t)}};var Xe=class extends ft{constructor(){super(()=>new q)}},W=new Xe;import{Vector3 as On}from"three";var Gt=new On,Ke=new On;function zn(r,t,e={},n=0,i=1/0){let s=n*n,o=i*i,c=1/0,f=null;if(r.shapecast({boundsTraverseOrder:u=>(Gt.copy(t).clamp(u.min,u.max),Gt.distanceToSquared(t)),intersectsBounds:(u,a,l)=>l<c&&l<o,intersectsTriangle:(u,a)=>{u.closestPointToPoint(t,Gt);let l=t.distanceToSquared(Gt);return l<c&&(Ke.copy(Gt),c=l,f=a),l<s}}),c===1/0)return null;let p=Math.sqrt(c);return e.point?e.point.copy(Ke):e.point=Ke.clone(),e.distance=p,e.faceIndex=f,e}function M(r,t){return t[r+15]===65535}function R(r,t){return t[r+6]}function O(r,t){return t[r+14]}function L(r){return r+8}function C(r,t){let e=t[r+6];return r+e*8}function ut(r,t){return t[r+7]}import{Vector3 as et,Vector2 as Xt,Triangle as Wt,DoubleSide as Po,BackSide as Io,REVISION as Gn}from"three";var ae=parseInt(Gn)>=169,Bo=parseInt(Gn)<=161,gt=new et,vt=new et,Tt=new et,le=new Xt,fe=new Xt,ue=new Xt,Un=new et,Vn=new et,Hn=new et,Yt=new et;function Eo(r,t,e,n,i,s,o,c){let f;if(s===Io?f=r.intersectTriangle(n,e,t,!0,i):f=r.intersectTriangle(t,e,n,s!==Po,i),f===null)return null;let p=r.origin.distanceTo(i);return p<o||p>c?null:{distance:p,point:i.clone()}}function kn(r,t,e,n,i,s,o,c,f,p,u){gt.fromBufferAttribute(t,s),vt.fromBufferAttribute(t,o),Tt.fromBufferAttribute(t,c);let a=Eo(r,gt,vt,Tt,Yt,f,p,u);if(a){if(n){le.fromBufferAttribute(n,s),fe.fromBufferAttribute(n,o),ue.fromBufferAttribute(n,c),a.uv=new Xt;let d=Wt.getInterpolation(Yt,gt,vt,Tt,le,fe,ue,a.uv);ae||(a.uv=d)}if(i){le.fromBufferAttribute(i,s),fe.fromBufferAttribute(i,o),ue.fromBufferAttribute(i,c),a.uv1=new Xt;let d=Wt.getInterpolation(Yt,gt,vt,Tt,le,fe,ue,a.uv1);ae||(a.uv1=d),Bo&&(a.uv2=a.uv1)}if(e){Un.fromBufferAttribute(e,s),Vn.fromBufferAttribute(e,o),Hn.fromBufferAttribute(e,c),a.normal=new et;let d=Wt.getInterpolation(Yt,gt,vt,Tt,Un,Vn,Hn,a.normal);a.normal.dot(r.direction)>0&&a.normal.multiplyScalar(-1),ae||(a.normal=d)}let l={a:s,b:o,c,normal:new et,materialIndex:0};if(Wt.getNormal(gt,vt,Tt,l.normal),a.face=l,a.faceIndex=s,ae){let d=new et;Wt.getBarycoord(Yt,gt,vt,Tt,d),a.barycoord=d}}return a}function qn(r){return r&&r.isMaterial?r.side:r}function Pt(r,t,e,n,i,s,o){let c=n*3,f=c+0,p=c+1,u=c+2,{index:a,groups:l}=r;r.index&&(f=a.getX(f),p=a.getX(p),u=a.getX(u));let{position:d,normal:h,uv:w,uv1:g}=r.attributes;if(Array.isArray(t)){let v=n*3;for(let m=0,y=l.length;m<y;m++){let{start:x,count:T,materialIndex:_}=l[m];if(v>=x&&v<x+T){let A=qn(t[_]),P=kn(e,d,h,w,g,f,p,u,A,s,o);if(P)if(P.faceIndex=n,P.face.materialIndex=_,i)i.push(P);else return P}}}else{let v=qn(t),m=kn(e,d,h,w,g,f,p,u,v,s,o);if(m)if(m.faceIndex=n,m.face.materialIndex=0,i)i.push(m);else return m}return null}import{Vector2 as Ws,Vector3 as Ys,Triangle as Xs}from"three";function U(r,t,e,n){let i=r.a,s=r.b,o=r.c,c=t,f=t+1,p=t+2;e&&(c=e.getX(c),f=e.getX(f),p=e.getX(p)),i.x=n.getX(c),i.y=n.getY(c),i.z=n.getZ(c),s.x=n.getX(f),s.y=n.getY(f),s.z=n.getZ(f),o.x=n.getX(p),o.y=n.getY(p),o.z=n.getZ(p)}function Wn(r,t,e,n,i,s,o,c){let{geometry:f,_indirectBuffer:p}=r;for(let u=n,a=n+i;u<a;u++)Pt(f,t,e,u,s,o,c)}function Yn(r,t,e,n,i,s,o){let{geometry:c,_indirectBuffer:f}=r,p=1/0,u=null;for(let a=n,l=n+i;a<l;a++){let d;d=Pt(c,t,e,a,null,s,o),d&&d.distance<p&&(u=d,p=d.distance)}return u}function Xn(r,t,e,n,i,s,o){let{geometry:c}=e,{index:f}=c,p=c.attributes.position;for(let u=r,a=t+r;u<a;u++){let l;if(l=u,U(o,l*3,f,p),o.needsUpdate=!0,n(o,l,i,s))return!0}return!1}function Kn(r,t=null){t&&Array.isArray(t)&&(t=new Set(t));let e=r.geometry,n=e.index?e.index.array:null,i=e.attributes.position,s,o,c,f,p=0,u=r._roots;for(let l=0,d=u.length;l<d;l++)s=u[l],o=new Uint32Array(s),c=new Uint16Array(s),f=new Float32Array(s),a(0,p),p+=s.byteLength;function a(l,d,h=!1){let w=l*2;if(M(w,c)){let g=R(l,o),v=O(w,c),m=1/0,y=1/0,x=1/0,T=-1/0,_=-1/0,A=-1/0;for(let P=3*g,I=3*(g+v);P<I;P++){let S=n[P],B=i.getX(S),b=i.getY(S),E=i.getZ(S);B<m&&(m=B),B>T&&(T=B),b<y&&(y=b),b>_&&(_=b),E<x&&(x=E),E>A&&(A=E)}return f[l+0]!==m||f[l+1]!==y||f[l+2]!==x||f[l+3]!==T||f[l+4]!==_||f[l+5]!==A?(f[l+0]=m,f[l+1]=y,f[l+2]=x,f[l+3]=T,f[l+4]=_,f[l+5]=A,!0):!1}else{let g=L(l),v=C(l,o),m=h,y=!1,x=!1;if(t){if(!m){let S=g/8+d/32,B=v/8+d/32;y=t.has(S),x=t.has(B),m=!y&&!x}}else y=!0,x=!0;let T=m||y,_=m||x,A=!1;T&&(A=a(g,d,m));let P=!1;_&&(P=a(v,d,m));let I=A||P;if(I)for(let S=0;S<3;S++){let B=g+S,b=v+S,E=f[B],F=f[B+3],D=f[b],z=f[b+3];f[l+S]=E<D?E:D,f[l+S+3]=F>z?F:z}return I}}}function G(r,t,e,n,i){let s,o,c,f,p,u,a=1/e.direction.x,l=1/e.direction.y,d=1/e.direction.z,h=e.origin.x,w=e.origin.y,g=e.origin.z,v=t[r],m=t[r+3],y=t[r+1],x=t[r+3+1],T=t[r+2],_=t[r+3+2];return a>=0?(s=(v-h)*a,o=(m-h)*a):(s=(m-h)*a,o=(v-h)*a),l>=0?(c=(y-w)*l,f=(x-w)*l):(c=(x-w)*l,f=(y-w)*l),s>f||c>o||((c>s||isNaN(s))&&(s=c),(f<o||isNaN(o))&&(o=f),d>=0?(p=(T-g)*d,u=(_-g)*d):(p=(_-g)*d,u=(T-g)*d),s>u||p>o)?!1:((p>s||s!==s)&&(s=p),(u<o||o!==o)&&(o=u),s<=i&&o>=n)}var Ze=class{constructor(){this.float32Array=null,this.uint16Array=null,this.uint32Array=null;let t=[],e=null;this.setBuffer=n=>{e&&t.push(e),e=n,this.float32Array=new Float32Array(n),this.uint16Array=new Uint16Array(n),this.uint32Array=new Uint32Array(n)},this.clearBuffer=()=>{e=null,this.float32Array=null,this.uint16Array=null,this.uint32Array=null,t.length!==0&&this.setBuffer(t.pop())}}},N=new Ze;function Zn(r,t,e,n,i,s,o,c){let{geometry:f,_indirectBuffer:p}=r;for(let u=n,a=n+i;u<a;u++){let l=p?p[u]:u;Pt(f,t,e,l,s,o,c)}}function Qn(r,t,e,n,i,s,o){let{geometry:c,_indirectBuffer:f}=r,p=1/0,u=null;for(let a=n,l=n+i;a<l;a++){let d;d=Pt(c,t,e,f?f[a]:a,null,s,o),d&&d.distance<p&&(u=d,p=d.distance)}return u}function $n(r,t,e,n,i,s,o){let{geometry:c}=e,{index:f}=c,p=c.attributes.position;for(let u=r,a=t+r;u<a;u++){let l;if(l=e.resolveTriangleIndex(u),U(o,l*3,f,p),o.needsUpdate=!0,n(o,l,i,s))return!0}return!1}function jn(r,t,e,n,i,s,o){N.setBuffer(r._roots[t]),G(0,N.float32Array,n,s,o)&&Qe(0,r,e,n,i,s,o),N.clearBuffer()}function Qe(r,t,e,n,i,s,o){let{float32Array:c,uint16Array:f,uint32Array:p}=N,u=r*2;if(M(u,f)){let l=R(r,p),d=O(u,f);Wn(t,e,n,l,d,i,s,o)}else{let l=L(r);G(l,c,n,s,o)&&Qe(l,t,e,n,i,s,o);let d=C(r,p);G(d,c,n,s,o)&&Qe(d,t,e,n,i,s,o)}}var Fo=["x","y","z"];function Jn(r,t,e,n,i,s){N.setBuffer(r._roots[t]);let o=null;return G(0,N.float32Array,n,i,s)&&(o=$e(0,r,e,n,i,s)),N.clearBuffer(),o}function $e(r,t,e,n,i,s){let{float32Array:o,uint16Array:c,uint32Array:f}=N,p=r*2;if(M(p,c)){let a=R(r,f),l=O(p,c);return Yn(t,e,n,a,l,i,s)}else{let a=ut(r,f),l=Fo[a],h=n.direction[l]>=0,w,g;h?(w=L(r),g=C(r,f)):(w=C(r,f),g=L(r));let m=G(w,o,n,i,s)?$e(w,t,e,n,i,s):null;if(m){let T=m.point[l];if(h?T<=o[g+a]:T>=o[g+a+3])return m}let x=G(g,o,n,i,s)?$e(g,t,e,n,i,s):null;return m&&x?m.distance<=x.distance?m:x:m||x||null}}import{Box3 as Ro,Matrix4 as Lo}from"three";function V(r,t,e){return e.min.x=t[r],e.min.y=t[r+1],e.min.z=t[r+2],e.max.x=t[r+3],e.max.y=t[r+4],e.max.z=t[r+5],e}function Kt(r){let t=-1,e=-1/0;for(let n=0;n<3;n++){let i=r[n+3]-r[n];i>e&&(e=i,t=n)}return t}function je(r,t,e){for(let n=0;n<3;n++){let i=t[r+2*n],s=t[r+2*n+1],o=i-s,c=i+s;o<e[n]&&(e[n]=o),c>e[n+3]&&(e[n+3]=c)}}function pe(r){let t=r[3]-r[0],e=r[4]-r[1],n=r[5]-r[2];return 2*(t*e+e*n+n*t)}import{BufferAttribute as Do}from"three";function Zt(r){return r.index?r.index.count:r.attributes.position.count}function pt(r){return Zt(r)/3}function Je(r,t=ArrayBuffer){return r>65535?new Uint32Array(new t(4*r)):new Uint16Array(new t(2*r))}function ti(r,t){if(!r.index){let e=r.attributes.position.count,n=t.useSharedArrayBuffer?SharedArrayBuffer:ArrayBuffer,i=Je(e,n);r.setIndex(new Do(i,1));for(let s=0;s<e;s++)i[s]=s}}function No(r,t,e){let n=Zt(r)/e,i=t||r.drawRange,s=i.start/e,o=(i.start+i.count)/e,c=Math.max(0,s),f=Math.min(n,o)-c;return{offset:Math.floor(c),count:Math.floor(f)}}function Mo(r,t){return r.groups.map(e=>({offset:e.start/t,count:e.count/t}))}function tn(r,t,e){let n=No(r,t,e),i=Mo(r,e);if(!i.length)return[n];let s=[],o=n.offset,c=n.offset+n.count,f=Zt(r)/e,p=[];for(let l of i){let{offset:d,count:h}=l,w=d,g=isFinite(h)?h:f-d,v=d+g;w<c&&v>o&&(p.push({pos:Math.max(o,w),isStart:!0}),p.push({pos:Math.min(c,v),isStart:!1}))}p.sort((l,d)=>l.pos!==d.pos?l.pos-d.pos:l.type==="end"?-1:1);let u=0,a=null;for(let l of p){let d=l.pos;u!==0&&d!==a&&s.push({offset:a,count:d-a}),u+=l.isStart?1:-1,a=d}return s}var de=new Ro,It=new q,Bt=new q,Qt=new Lo,ei=new H,me=new H;function ni(r,t,e,n){N.setBuffer(r._roots[t]);let i=en(0,r,e,n);return N.clearBuffer(),i}function en(r,t,e,n,i=null){let{float32Array:s,uint16Array:o,uint32Array:c}=N,f=r*2;if(i===null&&(e.boundingBox||e.computeBoundingBox(),ei.set(e.boundingBox.min,e.boundingBox.max,n),i=ei),M(f,o)){let u=t.geometry,a=u.index,l=u.attributes.position,d=e.index,h=e.attributes.position,w=R(r,c),g=O(f,o);if(Qt.copy(n).invert(),e.boundsTree)return V(r,s,me),me.matrix.copy(Qt),me.needsUpdate=!0,e.boundsTree.shapecast({intersectsBounds:m=>me.intersectsBox(m),intersectsTriangle:m=>{m.a.applyMatrix4(n),m.b.applyMatrix4(n),m.c.applyMatrix4(n),m.needsUpdate=!0;for(let y=w*3,x=(g+w)*3;y<x;y+=3)if(U(Bt,y,a,l),Bt.needsUpdate=!0,m.intersectsTriangle(Bt))return!0;return!1}});{let v=pt(e);for(let m=w*3,y=(g+w)*3;m<y;m+=3){U(It,m,a,l),It.a.applyMatrix4(Qt),It.b.applyMatrix4(Qt),It.c.applyMatrix4(Qt),It.needsUpdate=!0;for(let x=0,T=v*3;x<T;x+=3)if(U(Bt,x,d,h),Bt.needsUpdate=!0,It.intersectsTriangle(Bt))return!0}}}else{let u=L(r),a=C(r,c);return V(u,s,de),!!(i.intersectsBox(de)&&en(u,t,e,n,i)||(V(a,s,de),i.intersectsBox(de)&&en(a,t,e,n,i)))}}import{Matrix4 as Co,Vector3 as ye}from"three";var xe=new Co,nn=new H,$t=new H,Oo=new ye,zo=new ye,Uo=new ye,Vo=new ye;function ii(r,t,e,n={},i={},s=0,o=1/0){t.boundingBox||t.computeBoundingBox(),nn.set(t.boundingBox.min,t.boundingBox.max,e),nn.needsUpdate=!0;let c=r.geometry,f=c.attributes.position,p=c.index,u=t.attributes.position,a=t.index,l=W.getPrimitive(),d=W.getPrimitive(),h=Oo,w=zo,g=null,v=null;i&&(g=Uo,v=Vo);let m=1/0,y=null,x=null;return xe.copy(e).invert(),$t.matrix.copy(xe),r.shapecast({boundsTraverseOrder:T=>nn.distanceToBox(T),intersectsBounds:(T,_,A)=>A<m&&A<o?(_&&($t.min.copy(T.min),$t.max.copy(T.max),$t.needsUpdate=!0),!0):!1,intersectsRange:(T,_)=>{if(t.boundsTree)return t.boundsTree.shapecast({boundsTraverseOrder:P=>$t.distanceToBox(P),intersectsBounds:(P,I,S)=>S<m&&S<o,intersectsRange:(P,I)=>{for(let S=P,B=P+I;S<B;S++){U(d,3*S,a,u),d.a.applyMatrix4(e),d.b.applyMatrix4(e),d.c.applyMatrix4(e),d.needsUpdate=!0;for(let b=T,E=T+_;b<E;b++){U(l,3*b,p,f),l.needsUpdate=!0;let F=l.distanceToTriangle(d,h,g);if(F<m&&(w.copy(h),v&&v.copy(g),m=F,y=b,x=S),F<s)return!0}}}});{let A=pt(t);for(let P=0,I=A;P<I;P++){U(d,3*P,a,u),d.a.applyMatrix4(e),d.b.applyMatrix4(e),d.c.applyMatrix4(e),d.needsUpdate=!0;for(let S=T,B=T+_;S<B;S++){U(l,3*S,p,f),l.needsUpdate=!0;let b=l.distanceToTriangle(d,h,g);if(b<m&&(w.copy(h),v&&v.copy(g),m=b,y=S,x=P),b<s)return!0}}}}}),W.releasePrimitive(l),W.releasePrimitive(d),m===1/0?null:(n.point?n.point.copy(w):n.point=w.clone(),n.distance=m,n.faceIndex=y,i&&(i.point?i.point.copy(v):i.point=v.clone(),i.point.applyMatrix4(xe),w.applyMatrix4(xe),i.distance=w.sub(i.point).length(),i.faceIndex=x),n)}function oi(r,t=null){t&&Array.isArray(t)&&(t=new Set(t));let e=r.geometry,n=e.index?e.index.array:null,i=e.attributes.position,s,o,c,f,p=0,u=r._roots;for(let l=0,d=u.length;l<d;l++)s=u[l],o=new Uint32Array(s),c=new Uint16Array(s),f=new Float32Array(s),a(0,p),p+=s.byteLength;function a(l,d,h=!1){let w=l*2;if(M(w,c)){let g=R(l,o),v=O(w,c),m=1/0,y=1/0,x=1/0,T=-1/0,_=-1/0,A=-1/0;for(let P=g,I=g+v;P<I;P++){let S=3*r.resolveTriangleIndex(P);for(let B=0;B<3;B++){let b=S+B;b=n?n[b]:b;let E=i.getX(b),F=i.getY(b),D=i.getZ(b);E<m&&(m=E),E>T&&(T=E),F<y&&(y=F),F>_&&(_=F),D<x&&(x=D),D>A&&(A=D)}}return f[l+0]!==m||f[l+1]!==y||f[l+2]!==x||f[l+3]!==T||f[l+4]!==_||f[l+5]!==A?(f[l+0]=m,f[l+1]=y,f[l+2]=x,f[l+3]=T,f[l+4]=_,f[l+5]=A,!0):!1}else{let g=L(l),v=C(l,o),m=h,y=!1,x=!1;if(t){if(!m){let S=g/8+d/32,B=v/8+d/32;y=t.has(S),x=t.has(B),m=!y&&!x}}else y=!0,x=!0;let T=m||y,_=m||x,A=!1;T&&(A=a(g,d,m));let P=!1;_&&(P=a(v,d,m));let I=A||P;if(I)for(let S=0;S<3;S++){let B=g+S,b=v+S,E=f[B],F=f[B+3],D=f[b],z=f[b+3];f[l+S]=E<D?E:D,f[l+S+3]=F>z?F:z}return I}}}function ri(r,t,e,n,i,s,o){N.setBuffer(r._roots[t]),G(0,N.float32Array,n,s,o)&&on(0,r,e,n,i,s,o),N.clearBuffer()}function on(r,t,e,n,i,s,o){let{float32Array:c,uint16Array:f,uint32Array:p}=N,u=r*2;if(M(u,f)){let l=R(r,p),d=O(u,f);Zn(t,e,n,l,d,i,s,o)}else{let l=L(r);G(l,c,n,s,o)&&on(l,t,e,n,i,s,o);let d=C(r,p);G(d,c,n,s,o)&&on(d,t,e,n,i,s,o)}}var Ho=["x","y","z"];function si(r,t,e,n,i,s){N.setBuffer(r._roots[t]);let o=null;return G(0,N.float32Array,n,i,s)&&(o=rn(0,r,e,n,i,s)),N.clearBuffer(),o}function rn(r,t,e,n,i,s){let{float32Array:o,uint16Array:c,uint32Array:f}=N,p=r*2;if(M(p,c)){let a=R(r,f),l=O(p,c);return Qn(t,e,n,a,l,i,s)}else{let a=ut(r,f),l=Ho[a],h=n.direction[l]>=0,w,g;h?(w=L(r),g=C(r,f)):(w=C(r,f),g=L(r));let m=G(w,o,n,i,s)?rn(w,t,e,n,i,s):null;if(m){let T=m.point[l];if(h?T<=o[g+a]:T>=o[g+a+3])return m}let x=G(g,o,n,i,s)?rn(g,t,e,n,i,s):null;return m&&x?m.distance<=x.distance?m:x:m||x||null}}import{Box3 as ko,Matrix4 as qo}from"three";var ge=new ko,Et=new q,Ft=new q,jt=new qo,ci=new H,ve=new H;function ai(r,t,e,n){N.setBuffer(r._roots[t]);let i=sn(0,r,e,n);return N.clearBuffer(),i}function sn(r,t,e,n,i=null){let{float32Array:s,uint16Array:o,uint32Array:c}=N,f=r*2;if(i===null&&(e.boundingBox||e.computeBoundingBox(),ci.set(e.boundingBox.min,e.boundingBox.max,n),i=ci),M(f,o)){let u=t.geometry,a=u.index,l=u.attributes.position,d=e.index,h=e.attributes.position,w=R(r,c),g=O(f,o);if(jt.copy(n).invert(),e.boundsTree)return V(r,s,ve),ve.matrix.copy(jt),ve.needsUpdate=!0,e.boundsTree.shapecast({intersectsBounds:m=>ve.intersectsBox(m),intersectsTriangle:m=>{m.a.applyMatrix4(n),m.b.applyMatrix4(n),m.c.applyMatrix4(n),m.needsUpdate=!0;for(let y=w,x=g+w;y<x;y++)if(U(Ft,3*t.resolveTriangleIndex(y),a,l),Ft.needsUpdate=!0,m.intersectsTriangle(Ft))return!0;return!1}});{let v=pt(e);for(let m=w,y=g+w;m<y;m++){let x=t.resolveTriangleIndex(m);U(Et,3*x,a,l),Et.a.applyMatrix4(jt),Et.b.applyMatrix4(jt),Et.c.applyMatrix4(jt),Et.needsUpdate=!0;for(let T=0,_=v*3;T<_;T+=3)if(U(Ft,T,d,h),Ft.needsUpdate=!0,Et.intersectsTriangle(Ft))return!0}}}else{let u=L(r),a=C(r,c);return V(u,s,ge),!!(i.intersectsBox(ge)&&sn(u,t,e,n,i)||(V(a,s,ge),i.intersectsBox(ge)&&sn(a,t,e,n,i)))}}import{Matrix4 as Go,Vector3 as we}from"three";var Te=new Go,cn=new H,Jt=new H,Wo=new we,Yo=new we,Xo=new we,Ko=new we;function li(r,t,e,n={},i={},s=0,o=1/0){t.boundingBox||t.computeBoundingBox(),cn.set(t.boundingBox.min,t.boundingBox.max,e),cn.needsUpdate=!0;let c=r.geometry,f=c.attributes.position,p=c.index,u=t.attributes.position,a=t.index,l=W.getPrimitive(),d=W.getPrimitive(),h=Wo,w=Yo,g=null,v=null;i&&(g=Xo,v=Ko);let m=1/0,y=null,x=null;return Te.copy(e).invert(),Jt.matrix.copy(Te),r.shapecast({boundsTraverseOrder:T=>cn.distanceToBox(T),intersectsBounds:(T,_,A)=>A<m&&A<o?(_&&(Jt.min.copy(T.min),Jt.max.copy(T.max),Jt.needsUpdate=!0),!0):!1,intersectsRange:(T,_)=>{if(t.boundsTree){let A=t.boundsTree;return A.shapecast({boundsTraverseOrder:P=>Jt.distanceToBox(P),intersectsBounds:(P,I,S)=>S<m&&S<o,intersectsRange:(P,I)=>{for(let S=P,B=P+I;S<B;S++){let b=A.resolveTriangleIndex(S);U(d,3*b,a,u),d.a.applyMatrix4(e),d.b.applyMatrix4(e),d.c.applyMatrix4(e),d.needsUpdate=!0;for(let E=T,F=T+_;E<F;E++){let D=r.resolveTriangleIndex(E);U(l,3*D,p,f),l.needsUpdate=!0;let z=l.distanceToTriangle(d,h,g);if(z<m&&(w.copy(h),v&&v.copy(g),m=z,y=E,x=S),z<s)return!0}}}})}else{let A=pt(t);for(let P=0,I=A;P<I;P++){U(d,3*P,a,u),d.a.applyMatrix4(e),d.b.applyMatrix4(e),d.c.applyMatrix4(e),d.needsUpdate=!0;for(let S=T,B=T+_;S<B;S++){let b=r.resolveTriangleIndex(S);U(l,3*b,p,f),l.needsUpdate=!0;let E=l.distanceToTriangle(d,h,g);if(E<m&&(w.copy(h),v&&v.copy(g),m=E,y=S,x=P),E<s)return!0}}}}}),W.releasePrimitive(l),W.releasePrimitive(d),m===1/0?null:(n.point?n.point.copy(w):n.point=w.clone(),n.distance=m,n.faceIndex=y,i&&(i.point?i.point.copy(v):i.point=v.clone(),i.point.applyMatrix4(Te),w.applyMatrix4(Te),i.distance=w.sub(i.point).length(),i.faceIndex=x),n)}function an(r,t,e){return r===null?null:(r.point.applyMatrix4(t.matrixWorld),r.distance=r.point.distanceTo(e.ray.origin),r.object=t,r)}import{Box3 as or}from"three";function fi(){return typeof SharedArrayBuffer<"u"}import{Box3 as ir}from"three";function Ae(r,t,e,n,i){let s=1/0,o=1/0,c=1/0,f=-1/0,p=-1/0,u=-1/0,a=1/0,l=1/0,d=1/0,h=-1/0,w=-1/0,g=-1/0,v=r.offset||0;for(let m=(t-v)*6,y=(t+e-v)*6;m<y;m+=6){let x=r[m+0],T=r[m+1],_=x-T,A=x+T;_<s&&(s=_),A>f&&(f=A),x<a&&(a=x),x>h&&(h=x);let P=r[m+2],I=r[m+3],S=P-I,B=P+I;S<o&&(o=S),B>p&&(p=B),P<l&&(l=P),P>w&&(w=P);let b=r[m+4],E=r[m+5],F=b-E,D=b+E;F<c&&(c=F),D>u&&(u=D),b<d&&(d=b),b>g&&(g=b)}n[0]=s,n[1]=o,n[2]=c,n[3]=f,n[4]=p,n[5]=u,i[0]=a,i[1]=l,i[2]=d,i[3]=h,i[4]=w,i[5]=g}var it=8,fn=8,ln=new Int32Array(it),nt=new Float32Array(it*6),Dt=new Float32Array(it*6),$=new Float32Array(6),be=new Float32Array(6),dt=new Int32Array(fn),pi=new Float32Array(fn*6);function Qo(r,t,e,n){for(let i=0;i<3;i++){let s=t[r+2*i],o=t[r+2*i+1],c=s-o,f=s+o;c<e[n+i]&&(e[n+i]=c),f>e[n+i+3]&&(e[n+i+3]=f)}}function di(r,t){let e=r[t+3]-r[t],n=r[t+4]-r[t+1],i=r[t+5]-r[t+2];return 2*(e*n+n*i+i*e)}function mi(r,t,e,n,i,s){let o=-1,c=0;if(s===0)o=Kt(t),o!==-1&&(c=(t[o]+t[o+3])/2);else if(s===1)o=Kt(r),o!==-1&&(c=$o(e,n,i,o));else if(s===2){let f=pe(r),p=1.25*i,u=e.offset||0,a=(n-u)*6,l=(n+i-u)*6;for(let d=0;d<3;d++){let h=t[d],v=(t[d+3]-h)/it;if(i<fn){for(let m=0;m<i;m++){let y=a+m*6,x=e[y+2*d],T=m;for(;T>0&&e[dt[T-1]+2*d]>x;)dt[T]=dt[T-1],T--;dt[T]=y}for(let m=0;m<3;m++)$[m]=1/0,$[m+3]=-1/0,be[m]=1/0,be[m+3]=-1/0;for(let m=i-1;m>=0;m--)je(dt[m],e,be),pi.set(be,m*6);for(let m=0;m<i-1;m++){je(dt[m],e,$);let y=e[dt[m+1]+2*d];if(e[dt[m]+2*d]===y)continue;let x=m+1,T=i-x,_=pe($)/f,A=di(pi,x*6)/f,P=1+1.25*(_*x+A*T);P<p&&(o=d,p=P,c=y)}}else{for(let x=0;x<it;x++){ln[x]=0;for(let T=0;T<3;T++)nt[x*6+T]=1/0,nt[x*6+T+3]=-1/0}for(let x=a;x<l;x+=6){let A=~~((e[x+2*d]-h)/v);A>=it&&(A=it-1),ln[A]++,Qo(x,e,nt,A*6)}let m=(it-1)*6;for(let x=0;x<6;x++)Dt[m+x]=nt[m+x];for(let x=it-2;x>=0;x--){let T=x*6,_=T+6;for(let A=0;A<3;A++)Dt[T+A]=Math.min(nt[T+A],Dt[_+A]),Dt[T+A+3]=Math.max(nt[T+A+3],Dt[_+A+3])}let y=0;for(let x=0;x<it-1;x++){let T=x*6,_=ln[x];if(_!==0)for(let B=0;B<3;B++)y===0?($[B]=nt[T+B],$[B+3]=nt[T+B+3]):($[B]=Math.min($[B],nt[T+B]),$[B+3]=Math.max($[B+3],nt[T+B+3]));y+=_;let A=0,P=0;y!==0&&(A=pe($)/f);let I=i-y;I!==0&&(P=di(Dt,T+6)/f);let S=1+1.25*(A*y+P*I);S<p&&(o=d,p=S,c=h+v+x*v)}}}}else console.warn(`BVH: Invalid build strategy value ${s} used.`);return{axis:o,pos:c}}function $o(r,t,e,n){let i=0,s=r.offset;for(let o=t,c=t+e;o<c;o++)i+=r[(o-s)*6+n*2];return i/e}function hi(r,t,e,n,i,s){let o=n,c=n+i-1,f=s.pos,p=s.axis*2,u=e.offset||0;for(;;){for(;o<=c&&e[(o-u)*6+p]<f;)o++;for(;o<=c&&e[(c-u)*6+p]>=f;)c--;if(o<c){for(let a=0;a<t;a++){let l=r[o*t+a];r[o*t+a]=r[c*t+a],r[c*t+a]=l}for(let a=0;a<6;a++){let l=o-u,d=c-u,h=e[l*6+a];e[l*6+a]=e[d*6+a],e[d*6+a]=h}o++,c--}else return o}}var jo=Math.pow(2,32),Nt=new Float32Array(6),Se=new Float32Array(6);function Jo(r,t,e,n,i,s){let{maxDepth:o,verbose:c,targetLeafSize:f,_strictLeafSize:p=1/0,strategy:u,onProgress:a,useSharedArrayBuffer:l=!1}=i,d=r.primitiveBuffer,h=r.primitiveBufferStride,w=l?SharedArrayBuffer:ArrayBuffer,g=new w(32*Math.max(1,2*Math.ceil(n)-1)),v=new Float32Array(g),m=new Uint32Array(g),y=new Uint16Array(g),x=0,T=!1;return Ae(t,e,n,Nt,Se),P(e,n,0),g.slice(0,x*32);function _(I){a&&a((I-s.offset)/s.count)}function A(I,S,B){let b=I*2;m[I+6]=S,y[b+14]=B,y[b+15]=65535,_(S+B)}function P(I,S,B){let b=x++,E=b*8;v.set(Nt,E),!T&&B>=o&&(T=!0,c&&console.warn(`BVH: Max depth of ${o} reached when generating BVH. Consider increasing maxDepth.`));let F=S>p;if(S<=f&&!F||B>=o){A(E,I,S);return}let D=mi(Nt,Se,t,I,S,u),z=D.axis===-1?-1:hi(d,h,t,I,S,D);if(D.axis===-1||z===I||z===I+S){if(!F){A(E,I,S);return}D.axis=Math.max(0,Kt(Nt)),z=I+Math.max(1,Math.floor(S/2))}m[E+7]=D.axis;let ct=z-I;Ae(t,I,ct,Nt,Se),P(I,ct,B+1);let Ht=x-b;if(Ht>jo)throw new Error("MeshBVH: Cannot store relative child node offset greater than 32 bits.");m[E+6]=Ht;let kt=S-ct;Ae(t,z,kt,Nt,Se),P(z,kt,B+1)}}function xi(r,t){let e=r.getRootRanges(t.range),n=e[0],i=e[e.length-1],s={offset:n.offset,count:i.offset+i.count-n.offset},o=new Float32Array(6*s.count);o.offset=s.offset,r.computePrimitiveBounds(s.offset,s.count,o),r._roots=e.map(c=>Jo(r,o,c.offset,c.count,t,s))}import{Box3 as er}from"three";var mt,Rt,Mt=[],_e=new ft(()=>new er);function yi(r,t,e,n,i,s){mt=_e.getPrimitive(),Rt=_e.getPrimitive(),Mt.push(mt,Rt),N.setBuffer(r._roots[t]);let o=un(0,r.geometry,e,n,i,s);N.clearBuffer(),_e.releasePrimitive(mt),_e.releasePrimitive(Rt),Mt.pop(),Mt.pop();let c=Mt.length;return c>0&&(Rt=Mt[c-1],mt=Mt[c-2]),o}function un(r,t,e,n,i=null,s=0,o=0){let{float32Array:c,uint16Array:f,uint32Array:p}=N,u=r*2;if(M(u,f)){let l=R(r,p),d=O(u,f);return V(r,c,mt),n(l,d,!1,o,s+r/8,mt)}else{let S=function(b){let{uint16Array:E,uint32Array:F}=N,D=b*2;for(;!M(D,E);)b=L(b),D=b*2;return R(b,F)},B=function(b){let{uint16Array:E,uint32Array:F}=N,D=b*2;for(;!M(D,E);)b=C(b,F),D=b*2;return R(b,F)+O(D,E)},l=L(r),d=C(r,p),h=l,w=d,g,v,m,y;if(i&&(m=mt,y=Rt,V(h,c,m),V(w,c,y),g=i(m),v=i(y),v<g)){h=d,w=l;let b=g;g=v,v=b,m=y}m||(m=mt,V(h,c,m));let x=M(h*2,f),T=e(m,x,g,o+1,s+h/8),_;if(T===2){let b=S(h),F=B(h)-b;_=n(b,F,!0,o+1,s+h/8,m)}else _=T&&un(h,t,e,n,i,s,o+1);if(_)return!0;y=Rt,V(w,c,y);let A=M(w*2,f),P=e(y,A,v,o+1,s+w/8),I;if(P===2){let b=S(w),F=B(w)-b;I=n(b,F,!0,o+1,s+w/8,y)}else I=P&&un(w,t,e,n,i,s,o+1);return!!I}}import{Box3 as ee,Matrix4 as nr}from"three";var te=new N.constructor,Pe=new N.constructor,ht=new ft(()=>new ee),Lt=new ee,Ct=new ee,pn=new ee,dn=new ee,mn=!1;function gi(r,t,e,n){if(mn)throw new Error("MeshBVH: Recursive calls to bvhcast not supported.");mn=!0;let i=r._roots,s=t._roots,o,c=0,f=0,p=new nr().copy(e).invert();for(let u=0,a=i.length;u<a;u++){te.setBuffer(i[u]),f=0;let l=ht.getPrimitive();V(0,te.float32Array,l),l.applyMatrix4(p);for(let d=0,h=s.length;d<h&&(Pe.setBuffer(s[d]),o=j(0,0,e,p,n,c,f,0,0,l),Pe.clearBuffer(),f+=s[d].byteLength/32,!o);d++);if(ht.releasePrimitive(l),te.clearBuffer(),c+=i[u].byteLength/32,o)break}return mn=!1,o}function j(r,t,e,n,i,s=0,o=0,c=0,f=0,p=null,u=!1){let a,l;u?(a=Pe,l=te):(a=te,l=Pe);let d=a.float32Array,h=a.uint32Array,w=a.uint16Array,g=l.float32Array,v=l.uint32Array,m=l.uint16Array,y=r*2,x=t*2,T=M(y,w),_=M(x,m),A=!1;if(_&&T)u?A=i(R(t,v),O(t*2,m),R(r,h),O(r*2,w),f,o+t/8,c,s+r/8):A=i(R(r,h),O(r*2,w),R(t,v),O(t*2,m),c,s+r/8,f,o+t/8);else if(_){let P=ht.getPrimitive();V(t,g,P),P.applyMatrix4(e);let I=L(r),S=C(r,h);V(I,d,Lt),V(S,d,Ct);let B=P.intersectsBox(Lt),b=P.intersectsBox(Ct);A=B&&j(t,I,n,e,i,o,s,f,c+1,P,!u)||b&&j(t,S,n,e,i,o,s,f,c+1,P,!u),ht.releasePrimitive(P)}else{let P=L(t),I=C(t,v);V(P,g,pn),V(I,g,dn);let S=p.intersectsBox(pn),B=p.intersectsBox(dn);if(S&&B)A=j(r,P,e,n,i,s,o,c,f+1,p,u)||j(r,I,e,n,i,s,o,c,f+1,p,u);else if(S)if(T)A=j(r,P,e,n,i,s,o,c,f+1,p,u);else{let b=ht.getPrimitive();b.copy(pn).applyMatrix4(e);let E=L(r),F=C(r,h);V(E,d,Lt),V(F,d,Ct);let D=b.intersectsBox(Lt),z=b.intersectsBox(Ct);A=D&&j(P,E,n,e,i,o,s,f,c+1,b,!u)||z&&j(P,F,n,e,i,o,s,f,c+1,b,!u),ht.releasePrimitive(b)}else if(B)if(T)A=j(r,I,e,n,i,s,o,c,f+1,p,u);else{let b=ht.getPrimitive();b.copy(dn).applyMatrix4(e);let E=L(r),F=C(r,h);V(E,d,Lt),V(F,d,Ct);let D=b.intersectsBox(Lt),z=b.intersectsBox(Ct);A=D&&j(I,E,n,e,i,o,s,f,c+1,b,!u)||z&&j(I,F,n,e,i,o,s,f,c+1,b,!u),ht.releasePrimitive(b)}}return A}var Ie=new class{constructor(){let r=null,t=null,e=null,n=!1;this.root=null,this.buffer=null,this.uint32Array=null,this.uint16Array=null,this.setBVH=(s,o)=>{if(n)throw new Error("BVHTraversalHelper: cannot call setBVH during an active traversal.");this.root=o,this.buffer=r=s._roots[o],this.uint16Array=e=new Uint16Array(r),this.uint32Array=t=new Uint32Array(r)},this.reset=()=>{this.root=null,this.buffer=r=null,this.uint16Array=e=null,this.uint32Array=t=null},this.getRangeStart=s=>{let o=s*2;for(;!M(o,e);)s=L(s),o=s*2;return R(s,t)},this.getRangeEnd=s=>{let o=s*2;for(;!M(o,e);)s=C(s,t),o=s*2;return R(s,t)+O(o,e)};let i=(s,o,c)=>{let f=o*2,p=M(f,e);if(!s(c,p,o)&&!p){let a=L(o),l=C(o,t);i(s,a,c+1),i(s,l,c+1)}};this.traverseBuffer=s=>{if(n)throw new Error("BVHTraversalHelper: cannot start a traversal during an active traversal.");n=!0;try{i(s,0,0)}finally{n=!1}},this.traverse=s=>{this.traverseBuffer((o,c,f)=>{if(c){let p=f*2,u=t[f+6],a=e[p+14];return s(o,c,new Float32Array(r,f*4,6),u,a)}else{let p=ut(f,t);return s(o,c,new Float32Array(r,f*4,6),p)}})}}};var vi=new ir,Ot=new Float32Array(6),Be=class{constructor(){this._roots=null,this.primitiveBuffer=null,this.primitiveBufferStride=null}init(t){t={...ce,...t},"maxLeafSize"in t&&(console.warn('BVH: "maxLeafSize" option has been deprecated. Use "targetLeafSize", instead.'),t={...t,targetLeafSize:t.maxLeafSize}),xi(this,t)}getRootRanges(){throw new Error("BVH: getRootRanges() not implemented")}writePrimitiveBounds(){throw new Error("BVH: writePrimitiveBounds() not implemented")}writePrimitiveRangeBounds(t,e,n,i){let s=1/0,o=1/0,c=1/0,f=-1/0,p=-1/0,u=-1/0;for(let a=t,l=t+e;a<l;a++){this.writePrimitiveBounds(a,Ot,0);let[d,h,w,g,v,m]=Ot;d<s&&(s=d),g>f&&(f=g),h<o&&(o=h),v>p&&(p=v),w<c&&(c=w),m>u&&(u=m)}return n[i+0]=s,n[i+1]=o,n[i+2]=c,n[i+3]=f,n[i+4]=p,n[i+5]=u,n}computePrimitiveBounds(t,e,n){let i=n.offset||0;for(let s=t,o=t+e;s<o;s++){this.writePrimitiveBounds(s,Ot,0);let[c,f,p,u,a,l]=Ot,d=(c+u)/2,h=(f+a)/2,w=(p+l)/2,g=(u-c)/2,v=(a-f)/2,m=(l-p)/2,y=(s-i)*6;n[y+0]=d,n[y+1]=g+(Math.abs(d)+g)*St,n[y+2]=h,n[y+3]=v+(Math.abs(h)+v)*St,n[y+4]=w,n[y+5]=m+(Math.abs(w)+m)*St}return n}shiftPrimitiveOffsets(t){let e=this._indirectBuffer;if(e)for(let n=0,i=e.length;n<i;n++)e[n]+=t;else{let n=this._roots;for(let i=0;i<n.length;i++){let s=n[i],o=new Uint32Array(s),c=new Uint16Array(s),f=s.byteLength/32;for(let p=0;p<f;p++){let u=8*p,a=2*u;M(a,c)&&(o[u+6]+=t)}}}}traverse(t,e=0){Ie.setBVH(this,e),Ie.traverse(t),Ie.reset()}refit(){let t=this._roots;for(let e=0,n=t.length;e<n;e++){let i=t[e],s=new Uint32Array(i),o=new Uint16Array(i),c=new Float32Array(i),f=i.byteLength/32;for(let p=f-1;p>=0;p--){let u=p*8,a=u*2;if(M(a,o)){let d=R(u,s),h=O(a,o);this.writePrimitiveRangeBounds(d,h,Ot,0),c.set(Ot,u)}else{let d=L(u),h=C(u,s);for(let w=0;w<3;w++){let g=c[d+w],v=c[d+w+3],m=c[h+w],y=c[h+w+3];c[u+w]=g<m?g:m,c[u+w+3]=v>y?v:y}}}}}getBoundingBox(t){return t.makeEmpty(),this._roots.forEach(n=>{V(0,new Float32Array(n),vi),t.union(vi)}),t}shapecast(t){let{boundsTraverseOrder:e,intersectsBounds:n,intersectsRange:i,intersectsPrimitive:s,scratchPrimitive:o,iterate:c}=t;if(i&&s){let a=i;i=(l,d,h,w,g)=>a(l,d,h,w,g)?!0:c(l,d,this,s,h,w,o)}else i||(s?i=(a,l,d,h)=>c(a,l,this,s,d,h,o):i=(a,l,d)=>d);let f=!1,p=0,u=this._roots;for(let a=0,l=u.length;a<l;a++){let d=u[a];if(f=yi(this,a,n,i,e,p),f)break;p+=d.byteLength/32}return f}bvhcast(t,e,n){let{intersectsRanges:i}=n;return gi(this,t,e,i)}};function rr(r,t){let e=r[r.length-1],n=e.offset+e.count>2**16,i=r.reduce((p,u)=>p+u.count,0),s=n?4:2,o=t?new SharedArrayBuffer(i*s):new ArrayBuffer(i*s),c=n?new Uint32Array(o):new Uint16Array(o),f=0;for(let p=0;p<r.length;p++){let{offset:u,count:a}=r[p];for(let l=0;l<a;l++)c[f+l]=u+l;f+=a}return c}var zt=class extends Be{get indirect(){return!!this._indirectBuffer}get primitiveStride(){return null}get primitiveBufferStride(){return this.indirect?1:this.primitiveStride}set primitiveBufferStride(t){}get primitiveBuffer(){return this.indirect?this._indirectBuffer:this.geometry.index.array}set primitiveBuffer(t){}constructor(t,e={}){if(t.isBufferGeometry){if(t.index&&t.index.isInterleavedBufferAttribute)throw new Error("BVH: InterleavedBufferAttribute is not supported for the index attribute.")}else throw new Error("BVH: Only BufferGeometries are supported.");if(e.useSharedArrayBuffer&&!fi())throw new Error("BVH: SharedArrayBuffer is not available.");super(),this.geometry=t,this.resolvePrimitiveIndex=e.indirect?n=>this._indirectBuffer[n]:n=>n,this.primitiveBuffer=null,this.primitiveBufferStride=null,this._indirectBuffer=null,e={...ce,...e},e[at]||this.init(e)}init(t){let{geometry:e,primitiveStride:n}=this;if(t.indirect){let i=tn(e,t.range,n),s=rr(i,t.useSharedArrayBuffer);this._indirectBuffer=s}else ti(e,t);super.init(t),!e.boundingBox&&t.setBoundingBox&&(e.boundingBox=this.getBoundingBox(new or))}getRootRanges(t){return this.indirect?[{offset:0,count:this._indirectBuffer.length}]:tn(this.geometry,t,this.primitiveStride)}raycastObject3D(){throw new Error("BVH: raycastObject3D() not implemented")}};var Ee=new H,Fe=new cr,wi=new _i,Ai=new ar,bi=new _i,hn=["getX","getY","getZ"],Si=class r extends zt{static serialize(t,e={}){e={cloneBuffers:!0,...e};let n=t.geometry,i=t._roots,s=t._indirectBuffer,o=n.getIndex(),c={version:1,roots:null,index:null,indirectBuffer:null};return e.cloneBuffers?(c.roots=i.map(f=>f.slice()),c.index=o?o.array.slice():null,c.indirectBuffer=s?s.slice():null):(c.roots=i,c.index=o?o.array:null,c.indirectBuffer=s),c}static deserialize(t,e,n={}){n={setIndex:!0,indirect:!!t.indirectBuffer,...n};let{index:i,roots:s,indirectBuffer:o}=t;t.version||(console.warn("MeshBVH.deserialize: Serialization format has been changed and will be fixed up. It is recommended to regenerate any stored serialized data."),f(s));let c=new r(e,{...n,[at]:!0});if(c._roots=s,c._indirectBuffer=o||null,n.setIndex){let p=e.getIndex();if(p===null){let u=new sr(t.index,1,!1);e.setIndex(u)}else p.array!==i&&(p.array.set(i),p.needsUpdate=!0)}return c;function f(p){for(let u=0;u<p.length;u++){let a=p[u],l=new Uint32Array(a),d=new Uint16Array(a);for(let h=0,w=a.byteLength/32;h<w;h++){let g=8*h,v=2*g;M(v,d)||(l[g+6]=l[g+6]/8-h)}}}}get primitiveStride(){return 3}get resolveTriangleIndex(){return this.resolvePrimitiveIndex}constructor(t,e={}){e.maxLeafTris&&(console.warn('MeshBVH: "maxLeafTris" option has been deprecated. Use "targetLeafSize", instead.'),e={...e,targetLeafSize:e.maxLeafTris}),super(t,e)}shiftTriangleOffsets(t){return super.shiftPrimitiveOffsets(t)}writePrimitiveBounds(t,e,n){let i=this.geometry,s=this._indirectBuffer,o=i.attributes.position,c=i.index?i.index.array:null,p=(s?s[t]:t)*3,u=p+0,a=p+1,l=p+2;c&&(u=c[u],a=c[a],l=c[l]);for(let d=0;d<3;d++){let h=o[hn[d]](u),w=o[hn[d]](a),g=o[hn[d]](l),v=h;w<v&&(v=w),g<v&&(v=g);let m=h;w>m&&(m=w),g>m&&(m=g),e[n+d]=v,e[n+d+3]=m}return e}computePrimitiveBounds(t,e,n){let i=this.geometry,s=this._indirectBuffer,o=i.attributes.position,c=i.index?i.index.array:null,f=o.normalized;if(t<0||e+t-n.offset>n.length/6)throw new Error("MeshBVH: compute triangle bounds range is invalid.");let p=o.array,u=o.offset||0,a=3;o.isInterleavedBufferAttribute&&(a=o.data.stride);let l=["getX","getY","getZ"],d=n.offset;for(let h=t,w=t+e;h<w;h++){let v=(s?s[h]:h)*3,m=(h-d)*6,y=v+0,x=v+1,T=v+2;c&&(y=c[y],x=c[x],T=c[T]),f||(y=y*a+u,x=x*a+u,T=T*a+u);for(let _=0;_<3;_++){let A,P,I;f?(A=o[l[_]](y),P=o[l[_]](x),I=o[l[_]](T)):(A=p[y+_],P=p[x+_],I=p[T+_]);let S=A;P<S&&(S=P),I<S&&(S=I);let B=A;P>B&&(B=P),I>B&&(B=I);let b=(B-S)/2,E=_*2;n[m+E+0]=S+b,n[m+E+1]=b+(Math.abs(S)+b)*St}}return n}raycastObject3D(t,e,n=[]){let{material:i}=t;if(i===void 0)return;Ai.copy(t.matrixWorld).invert(),Fe.copy(e.ray).applyMatrix4(Ai),bi.setFromMatrixScale(t.matrixWorld),wi.copy(Fe.direction).multiply(bi);let s=wi.length(),o=e.near/s,c=e.far/s;if(e.firstHitOnly===!0){let f=this.raycastFirst(Fe,i,o,c);f=an(f,t,e),f&&n.push(f)}else{let f=this.raycast(Fe,i,o,c);for(let p=0,u=f.length;p<u;p++){let a=an(f[p],t,e);a&&n.push(a)}}return n}refit(t=null){return(this.indirect?oi:Kn)(this,t)}raycast(t,e=Ti,n=0,i=1/0){let s=this._roots,o=[],c=this.indirect?ri:jn;for(let f=0,p=s.length;f<p;f++)c(this,f,e,t,o,n,i);return o}raycastFirst(t,e=Ti,n=0,i=1/0){let s=this._roots,o=null,c=this.indirect?si:Jn;for(let f=0,p=s.length;f<p;f++){let u=c(this,f,e,t,n,i);u!=null&&(o==null||u.distance<o.distance)&&(o=u)}return o}intersectsGeometry(t,e){let n=!1,i=this._roots,s=this.indirect?ai:ni;for(let o=0,c=i.length;o<c&&(n=s(this,o,t,e),!n);o++);return n}shapecast(t){let e=W.getPrimitive(),n=super.shapecast({...t,intersectsPrimitive:t.intersectsTriangle,scratchPrimitive:e,iterate:this.indirect?$n:Xn});return W.releasePrimitive(e),n}bvhcast(t,e,n){let{intersectsRanges:i,intersectsTriangles:s}=n,o=W.getPrimitive(),c=this.geometry.index,f=this.geometry.attributes.position,p=this.indirect?h=>{let w=this.resolveTriangleIndex(h);U(o,w*3,c,f)}:h=>{U(o,h*3,c,f)},u=W.getPrimitive(),a=t.geometry.index,l=t.geometry.attributes.position,d=t.indirect?h=>{let w=t.resolveTriangleIndex(h);U(u,w*3,a,l)}:h=>{U(u,h*3,a,l)};if(s){if(!(t instanceof r))throw new Error('MeshBVH: "intersectsTriangles" callback can only be used with another MeshBVH.');let h=(w,g,v,m,y,x,T,_)=>{for(let A=v,P=v+m;A<P;A++){d(A),u.a.applyMatrix4(e),u.b.applyMatrix4(e),u.c.applyMatrix4(e),u.needsUpdate=!0;for(let I=w,S=w+g;I<S;I++)if(p(I),o.needsUpdate=!0,s(o,u,I,A,y,x,T,_))return!0}return!1};if(i){let w=i;i=function(g,v,m,y,x,T,_,A){return w(g,v,m,y,x,T,_,A)?!0:h(g,v,m,y,x,T,_,A)}}else i=h}return super.bvhcast(t,e,{intersectsRanges:i})}intersectsBox(t,e){return Ee.set(t.min,t.max,e),Ee.needsUpdate=!0,this.shapecast({intersectsBounds:n=>Ee.intersectsBox(n),intersectsTriangle:n=>Ee.intersectsTriangle(n)})}intersectsSphere(t){return this.shapecast({intersectsBounds:e=>t.intersectsBox(e),intersectsTriangle:e=>e.intersectsSphere(t)})}closestPointToGeometry(t,e,n={},i={},s=0,o=1/0){return(this.indirect?li:ii)(this,t,e,n,i,s,o)}closestPointToPoint(t,e={},n=0,i=1/0){return zn(this,t,e,n,i)}};import{Vector3 as J,Vector2 as ie,Ray as lr,Matrix4 as fr,FrontSide as ur,BackSide as pr,Triangle as ne,REVISION as Li}from"three";var Ii=new J,Bi=new J,Ei=new J,st=new lr,Fi=new fr,wt=new J,yn=new J,dr=["x","y","z"],De=parseInt(Li)>=169,mr=parseInt(Li)<=161,Ne=new ie,Me=new ie,Re=new ie,Di=new J,Ni=new J,Mi=new J,Ri=class extends zt{get primitiveStride(){return 3}constructor(t,e={}){if(!t.isMesh)throw new Error("SkinnedMeshBVH: First argument must be a Mesh.");super(t.geometry,{...e,[at]:!0}),this.mesh=t,e[at]||this.init(e)}writePrimitiveBounds(t,e,n){let{mesh:i,geometry:s}=this,o=this._indirectBuffer,c=s.index?s.index.array:null,p=(o?o[t]:t)*3,u=p+0,a=p+1,l=p+2;c&&(u=c[u],a=c[a],l=c[l]),i.getVertexPosition(u,Ii),i.getVertexPosition(a,Bi),i.getVertexPosition(l,Ei);for(let d=0;d<3;d++){let h=dr[d],w=Ii[h],g=Bi[h],v=Ei[h],m=w;g<m&&(m=g),v<m&&(m=v);let y=w;g>y&&(y=g),v>y&&(y=v),e[n+d]=m,e[n+d+3]=y}return e}shapecast(t){let e=new q;return super.shapecast({...t,intersectsPrimitive:t.intersectsTriangle,scratchPrimitive:e,iterate:hr})}raycastObject3D(t,e,n=[]){let{material:i}=t;if(i===void 0)return;let{matrixWorld:s}=t,{firstHitOnly:o}=e;Fi.copy(s).invert(),st.copy(e.ray).applyMatrix4(Fi);let c=null,f=1/0;return this.shapecast({boundsTraverseOrder:p=>p.distanceToPoint(st.origin),intersectsBounds:p=>{if(o){if(!st.intersectBox(p,yn))return 0;let u;return p.containsPoint(st.origin)?u=0:(yn.applyMatrix4(s),u=e.ray.origin.distanceTo(yn)),u<f?1:0}else return st.intersectsBox(p)?1:0},intersectsTriangle:(p,u)=>{let a=null;if(i.side===ur?a=st.intersectTriangle(p.a,p.b,p.c,!0,wt):i.side===pr?a=st.intersectTriangle(p.c,p.b,p.a,!0,wt):a=st.intersectTriangle(p.a,p.b,p.c,!1,wt),!a)return;a=a.clone().applyMatrix4(s);let l=e.ray.origin.distanceTo(a);if(l>=e.near&&l<=e.far){if(o&&l>=f)return;let{geometry:d}=this,{index:h}=d,w=this.resolvePrimitiveIndex(u),g=w*3,v=g+0,m=g+1,y=g+2;h&&(v=h.array[v],m=h.array[m],y=h.array[y]);let x={distance:l,point:a.clone(),object:t,uv:null,uv1:null,normal:null,face:{a:v,b:m,c:y,normal:ne.getNormal(p.a,p.b,p.c,new J),materialIndex:0},faceIndex:w};if(De){let P=new J;ne.getBarycoord(wt,p.a,p.b,p.c,P),x.barycoord=P}let T=d.attributes.uv,_=d.attributes.uv1,A=d.attributes.normal;if(T){Ne.fromBufferAttribute(T,v),Me.fromBufferAttribute(T,m),Re.fromBufferAttribute(T,y),x.uv=new ie;let P=ne.getInterpolation(wt,p.a,p.b,p.c,Ne,Me,Re,x.uv);De||(x.uv=P)}if(_){Ne.fromBufferAttribute(_,v),Me.fromBufferAttribute(_,m),Re.fromBufferAttribute(_,y),x.uv1=new ie;let P=ne.getInterpolation(wt,p.a,p.b,p.c,Ne,Me,Re,x.uv1);De||(x.uv1=P),mr&&(x.uv2=x.uv1)}if(A){Di.fromBufferAttribute(A,v),Ni.fromBufferAttribute(A,m),Mi.fromBufferAttribute(A,y),x.normal=new J;let P=ne.getInterpolation(wt,p.a,p.b,p.c,Di,Ni,Mi,x.normal);x.normal.dot(st.direction)>0&&x.normal.multiplyScalar(-1),De||(x.normal=P)}f=x.distance,c=x,o||n.push(x)}}}),o&&c&&n.push(c),n}};function hr(r,t,e,n,i,s,o){let{mesh:c,geometry:f}=e,p=f.index?f.index.array:null;for(let u=r,a=t+r;u<a;u++){let l=e.resolvePrimitiveIndex(u),d=3*l+0,h=3*l+1,w=3*l+2;if(p&&(d=p[d],h=p[h],w=p[w]),c.getVertexPosition(d,o.a),c.getVertexPosition(h,o.b),c.getVertexPosition(w,o.c),o.needsUpdate=!0,n(o,u,i,s))return!0}return!1}import{DataTexture as xr,FloatType as Le,IntType as gn,UnsignedIntType as Ce,ByteType as Ci,UnsignedByteType as Oi,ShortType as yr,UnsignedShortType as gr,RedFormat as vr,RGFormat as Tr,RGBAFormat as vn,RedIntegerFormat as wr,RGIntegerFormat as Ar,RGBAIntegerFormat as Tn,NearestFilter as zi}from"three";function br(r){switch(r){case 1:return"R";case 2:return"RG";case 3:return"RGBA";case 4:return"RGBA"}throw new Error}function Sr(r){switch(r){case 1:return vr;case 2:return Tr;case 3:return vn;case 4:return vn}}function Ui(r){switch(r){case 1:return wr;case 2:return Ar;case 3:return Tn;case 4:return Tn}}var Oe=class extends xr{constructor(){super(),this.minFilter=zi,this.magFilter=zi,this.generateMipmaps=!1,this.overrideItemSize=null,this._forcedType=null}updateFrom(t){let e=this.overrideItemSize,n=t.itemSize,i=t.count;if(e!==null){if(n*i%e!==0)throw new Error("VertexAttributeTexture: overrideItemSize must divide evenly into buffer length.");t.itemSize=e,t.count=i*n/e}let s=t.itemSize,o=t.count,c=t.normalized,f=t.array.constructor,p=f.BYTES_PER_ELEMENT,u=this._forcedType,a=s;if(u===null)switch(f){case Float32Array:u=Le;break;case Uint8Array:case Uint16Array:case Uint32Array:u=Ce;break;case Int8Array:case Int16Array:case Int32Array:u=gn;break}let l,d,h,w,g=br(s);switch(u){case Le:h=1,d=Sr(s),c&&p===1?(w=f,g+="8",f===Uint8Array?l=Oi:(l=Ci,g+="_SNORM")):(w=Float32Array,g+="32F",l=Le);break;case gn:g+=p*8+"I",h=c?Math.pow(2,f.BYTES_PER_ELEMENT*8-1):1,d=Ui(s),p===1?(w=Int8Array,l=Ci):p===2?(w=Int16Array,l=yr):(w=Int32Array,l=gn);break;case Ce:g+=p*8+"UI",h=c?Math.pow(2,f.BYTES_PER_ELEMENT*8-1):1,d=Ui(s),p===1?(w=Uint8Array,l=Oi):p===2?(w=Uint16Array,l=gr):(w=Uint32Array,l=Ce);break}a===3&&(d===vn||d===Tn)&&(a=4);let v=Math.ceil(Math.sqrt(o))||1,m=a*v*v,y=new w(m),x=t.normalized;t.normalized=!1;for(let T=0;T<o;T++){let _=a*T;y[_]=t.getX(T)/h,s>=2&&(y[_+1]=t.getY(T)/h),s>=3&&(y[_+2]=t.getZ(T)/h,a===4&&(y[_+3]=1)),s>=4&&(y[_+3]=t.getW(T)/h)}t.normalized=x,this.internalFormat=g,this.format=d,this.type=l,this.image.width=v,this.image.height=v,this.image.data=y,this.needsUpdate=!0,this.dispose(),t.itemSize=n,t.count=i}},ze=class extends Oe{constructor(){super(),this._forcedType=Ce}};var Ue=class extends Oe{constructor(){super(),this._forcedType=Le}};import{DataTexture as Vi,FloatType as _r,UnsignedIntType as Pr,RGBAFormat as Ir,RGIntegerFormat as Br,NearestFilter as Ve,BufferAttribute as Er}from"three";var Hi=class{constructor(){this.index=new ze,this.position=new Ue,this.bvhBounds=new Vi,this.bvhContents=new Vi,this._cachedIndexAttr=null,this.index.overrideItemSize=3}updateFrom(t){let{geometry:e}=t;if(Dr(t,this.bvhBounds,this.bvhContents),this.position.updateFrom(e.attributes.position),t.indirect){let n=t._indirectBuffer;if(this._cachedIndexAttr===null||this._cachedIndexAttr.count!==n.length)if(e.index)this._cachedIndexAttr=e.index.clone();else{let i=Je(Zt(e));this._cachedIndexAttr=new Er(i,1,!1)}Fr(e,n,this._cachedIndexAttr),this.index.updateFrom(this._cachedIndexAttr)}else this.index.updateFrom(e.index)}dispose(){let{index:t,position:e,bvhBounds:n,bvhContents:i}=this;t&&t.dispose(),e&&e.dispose(),n&&n.dispose(),i&&i.dispose()}};function Fr(r,t,e){let n=e.array,i=r.index?r.index.array:null;for(let s=0,o=t.length;s<o;s++){let c=3*s,f=3*t[s];for(let p=0;p<3;p++)n[c+p]=i?i[f+p]:f+p}}function Dr(r,t,e){let n=r._roots;if(n.length!==1)throw new Error("MeshBVHUniformStruct: Multi-root BVHs not supported.");let i=n[0],s=new Uint16Array(i),o=new Uint32Array(i),c=new Float32Array(i),f=i.byteLength/32,p=2*Math.ceil(Math.sqrt(f/2)),u=new Float32Array(4*p*p),a=Math.ceil(Math.sqrt(f)),l=new Uint32Array(2*a*a);for(let d=0;d<f;d++){let h=d*32/4,w=h*2,g=h;for(let v=0;v<3;v++)u[8*d+0+v]=c[g+0+v],u[8*d+4+v]=c[g+3+v];if(M(w,s)){let v=O(w,s),m=R(h,o),y=-65536|v;l[d*2+0]=y,l[d*2+1]=m}else{let v=o[h+6],m=ut(h,o);l[d*2+0]=m,l[d*2+1]=v}}t.image.data=u,t.image.width=p,t.image.height=p,t.format=Ir,t.type=_r,t.internalFormat="RGBA32F",t.minFilter=Ve,t.magFilter=Ve,t.generateMipmaps=!1,t.needsUpdate=!0,t.dispose(),e.image.data=l,e.image.width=a,e.image.height=a,e.format=Br,e.type=Pr,e.internalFormat="RG32UI",e.minFilter=Ve,e.magFilter=Ve,e.generateMipmaps=!1,e.needsUpdate=!0,e.dispose()}var bn={};mo(bn,{bvh_distance_functions:()=>ki,bvh_ray_functions:()=>An,bvh_struct_definitions:()=>qi,common_functions:()=>wn});var wn=`

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
`;var ki=`

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
`;var An=`

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
`;var qi=`
struct BVH {

	usampler2D index;
	sampler2D position;

	sampler2D bvhBounds;
	usampler2D bvhContents;

};
`;var Ul=`
	${wn}
	${An}
`;import{BufferAttribute as oe}from"three";function nf(r,t,e){let n=r.index,s=r.attributes.position.count,o=n?n.count:s,c=r.groups;c.length===0&&(c=[{count:o,start:0,materialIndex:0}]);let f=r.getAttribute("materialIndex");if(!f||f.count!==s){let u;e.length<=255?u=new Uint8Array(s):u=new Uint16Array(s),f=new oe(u,1,!1),r.deleteAttribute("materialIndex"),r.setAttribute("materialIndex",f)}let p=f.array;for(let u=0;u<c.length;u++){let a=c[u],l=a.start,d=a.count,h=Math.min(d,o-l),w=Array.isArray(t)?t[a.materialIndex]:t,g=e.indexOf(w);for(let v=0;v<h;v++){let m=l+v;n&&(m=n.getX(m)),p[m]=g}}}function of(r,t){if(!r.index){let e=r.attributes.position.count,n=new Array(e);for(let i=0;i<e;i++)n[i]=i;r.setIndex(n)}if(!r.attributes.normal&&t&&t.includes("normal")&&r.computeVertexNormals(),!r.attributes.uv&&t&&t.includes("uv")){let e=r.attributes.position.count;r.setAttribute("uv",new oe(new Float32Array(e*2),2,!1))}if(!r.attributes.uv2&&t&&t.includes("uv2")){let e=r.attributes.position.count;r.setAttribute("uv2",new oe(new Float32Array(e*2),2,!1))}if(!r.attributes.tangent&&t&&t.includes("tangent"))if(r.attributes.uv&&r.attributes.normal)r.computeTangents();else{let e=r.attributes.position.count;r.setAttribute("tangent",new oe(new Float32Array(e*4),4,!1))}if(!r.attributes.color&&t&&t.includes("color")){let e=r.attributes.position.count,n=new Float32Array(e*4);n.fill(1),r.setAttribute("color",new oe(n,4))}}import{DataTexture as Sn,RedFormat as Gi,LinearFilter as Ut,DataUtils as At,HalfFloatType as xt,TextureSource as Mr,RepeatWrapping as _n,RGBAFormat as Rr,FloatType as Lr,ClampToEdgeWrapping as Cr}from"three";import{DataUtils as Nr}from"three";function He(r){let t=new Uint16Array(r.length);for(let e=0,n=r.length;e<n;++e)t[e]=Nr.toHalfFloat(r[e]);return t}function Wi(r,t,e=0,n=r.length){let i=e,s=e+n-1;for(;i<s;){let o=i+s>>1;r[o]<t?i=o+1:s=o}return i-e}function Or(r,t,e){return .2126*r+.7152*t+.0722*e}function zr(r,t=xt){let e=r.clone();e.source=new Mr({...e.image});let{width:n,height:i,data:s}=e.image,o=s;if(e.type!==t){t===xt?o=new Uint16Array(s.length):o=new Float32Array(s.length);let c;s instanceof Int8Array||s instanceof Int16Array||s instanceof Int32Array?c=2**(8*s.BYTES_PER_ELEMENT-1)-1:c=2**(8*s.BYTES_PER_ELEMENT)-1;for(let f=0,p=s.length;f<p;f++){let u=s[f];e.type===xt&&(u=At.fromHalfFloat(s[f])),e.type!==Lr&&e.type!==xt&&(u/=c),t===xt&&(o[f]=At.toHalfFloat(u))}e.image.data=o,e.type=t}if(e.flipY){let c=o;o=o.slice();for(let f=0;f<i;f++)for(let p=0;p<n;p++){let u=i-f-1,a=4*(f*n+p),l=4*(u*n+p);o[l+0]=c[a+0],o[l+1]=c[a+1],o[l+2]=c[a+2],o[l+3]=c[a+3]}e.flipY=!1,e.image.data=o}return e}var Yi=class{constructor(){let t=new Sn(He(new Float32Array([0,0,0,0])),1,1);t.type=xt,t.format=Rr,t.minFilter=Ut,t.magFilter=Ut,t.wrapS=_n,t.wrapT=_n,t.generateMipmaps=!1,t.needsUpdate=!0;let e=new Sn(He(new Float32Array([0,1])),1,2);e.type=xt,e.format=Gi,e.minFilter=Ut,e.magFilter=Ut,e.generateMipmaps=!1,e.needsUpdate=!0;let n=new Sn(He(new Float32Array([0,0,1,1])),2,2);n.type=xt,n.format=Gi,n.minFilter=Ut,n.magFilter=Ut,n.generateMipmaps=!1,n.needsUpdate=!0,this.map=t,this.marginalWeights=e,this.conditionalWeights=n,this.totalSum=0}getPixelWeight(t,e,n){return Or(t,e,n)}dispose(){this.marginalWeights.dispose(),this.conditionalWeights.dispose(),this.map.dispose()}updateFrom(t){let e=zr(t);e.wrapS=_n,e.wrapT=Cr;let{width:n,height:i,data:s}=e.image,o=new Float32Array(n*i),c=new Float32Array(n*i),f=new Float32Array(i),p=new Float32Array(i),u=0,a=0;for(let g=0;g<i;g++){let v=0;for(let m=0;m<n;m++){let y=g*n+m,x=At.fromHalfFloat(s[4*y+0]),T=At.fromHalfFloat(s[4*y+1]),_=At.fromHalfFloat(s[4*y+2]),A=this.getPixelWeight(x,T,_,g,i);v+=A,u+=A,o[y]=A,c[y]=v}if(v!==0)for(let m=g*n,y=g*n+n;m<y;m++)o[m]/=v,c[m]/=v;a+=v,f[g]=v,p[g]=a}if(a!==0)for(let g=0,v=f.length;g<v;g++)f[g]/=a,p[g]/=a;let l=new Uint16Array(i),d=new Uint16Array(n*i);for(let g=0;g<i;g++){let v=(g+1)/i,m=Wi(p,v);l[g]=At.toHalfFloat((m+.5)/i)}for(let g=0;g<i;g++)for(let v=0;v<n;v++){let m=g*n+v,y=(v+1)/n,x=Wi(c,y,g*n,n);d[m]=At.toHalfFloat((x+.5)/n)}this.dispose();let{marginalWeights:h,conditionalWeights:w}=this;h.image={width:i,height:1,data:l},h.needsUpdate=!0,w.image={width:n,height:i,data:d},w.needsUpdate=!0,this.totalSum=u,this.map=e,this.cdfMarginal=p,this.cdfConditional=c}};import{DataTexture as Ur,RGBAFormat as Vr,ClampToEdgeWrapping as Ki,FloatType as Hr,Vector3 as re,Quaternion as kr,Matrix4 as qr,NearestFilter as Zi}from"three";function Xi(r){let t=0;if(r.byteLength!==0){let e=new Uint8Array(r);for(let n=0;n<r.byteLength;n++){let i=e[n];t=(t<<5)-t+i,t|=0}}return t}var Pn=6,Gr=11,Wr=0,Yr=1,Xr=2,Kr=3,Zr=4,tt=new re,X=new re,Qi=new qr,Vt=new kr,$i=new re,ot=new re,Qr=new re(0,1,0),ji=class{constructor(){let t=new Ur(new Float32Array(4),1,1);t.format=Vr,t.type=Hr,t.wrapS=Ki,t.wrapT=Ki,t.generateMipmaps=!1,t.minFilter=Zi,t.magFilter=Zi,this.tex=t,this.count=0}updateFrom(t,e=[]){let n=this.tex,i=Math.max(t.length*Pn,1),s=Math.ceil(Math.sqrt(i));n.image.width!==s&&(n.dispose(),n.image.data=new Float32Array(s*s*4),n.image.width=s,n.image.height=s);let o=n.image.data;for(let f=0,p=t.length;f<p;f++){let u=t[f],a=f*Pn*4,l=0;for(let h=0;h<Pn*4;h++)o[a+h]=0;u.getWorldPosition(X),o[a+l++]=X.x,o[a+l++]=X.y,o[a+l++]=X.z;let d=Wr;if(u.isRectAreaLight&&u.isCircular?d=Yr:u.isSpotLight?d=Xr:u.isDirectionalLight||u.isSunLight?d=Kr:u.isPointLight&&(d=Zr),o[a+l++]=d,o[a+l++]=u.color.r,o[a+l++]=u.color.g,o[a+l++]=u.color.b,o[a+l++]=u.intensity,u.getWorldQuaternion(Vt),u.isRectAreaLight)tt.set(u.width,0,0).applyQuaternion(Vt),o[a+l++]=tt.x,o[a+l++]=tt.y,o[a+l++]=tt.z,l++,X.set(0,u.height,0).applyQuaternion(Vt),o[a+l++]=X.x,o[a+l++]=X.y,o[a+l++]=X.z,o[a+l++]=tt.cross(X).length()*(u.isCircular?Math.PI/4:1);else if(u.isSpotLight){let h=u.radius||0;$i.setFromMatrixPosition(u.matrixWorld),ot.setFromMatrixPosition(u.target.matrixWorld),Qi.lookAt($i,ot,Qr),Vt.setFromRotationMatrix(Qi),tt.set(1,0,0).applyQuaternion(Vt),o[a+l++]=tt.x,o[a+l++]=tt.y,o[a+l++]=tt.z,l++,X.set(0,1,0).applyQuaternion(Vt),o[a+l++]=X.x,o[a+l++]=X.y,o[a+l++]=X.z,o[a+l++]=Math.PI*h*h,o[a+l++]=h,o[a+l++]=u.decay,o[a+l++]=u.distance,o[a+l++]=Math.cos(u.angle),o[a+l++]=Math.cos(u.angle*(1-u.penumbra)),o[a+l++]=u.iesMap?e.indexOf(u.iesMap):-1}else if(u.isPointLight){let h=tt.setFromMatrixPosition(u.matrixWorld);o[a+l++]=h.x,o[a+l++]=h.y,o[a+l++]=h.z,l++,l+=4,l+=1,o[a+l++]=u.decay,o[a+l++]=u.distance}else if(u.isDirectionalLight){let h=tt.setFromMatrixPosition(u.matrixWorld),w=X.setFromMatrixPosition(u.target.matrixWorld);ot.subVectors(h,w).normalize(),o[a+l++]=ot.x,o[a+l++]=ot.y,o[a+l++]=ot.z}else u.isSunLight&&(ot.setFromMatrixPosition(u.matrixWorld).normalize(),o[a+l++]=ot.x,o[a+l++]=ot.y,o[a+l++]=ot.z);o[a+Gr]=u.visibleToCameraRays?1:0}this.count=t.length;let c=Xi(o.buffer);return this.hash!==c?(this.hash=c,n.needsUpdate=!0,!0):!1}};function In(r,t){return r.uuid<t.uuid?1:r.uuid>t.uuid?-1:0}function $r(r){return`${r.source.uuid}:${r.colorSpace}`}function jr(r){let t=new Set,e=[];for(let n=0,i=r.length;n<i;n++){let s=r[n],o=$r(s);t.has(o)||(t.add(o),e.push(s))}return e}function hf(r){let t=r.map(n=>n.iesMap||null).filter(n=>n),e=new Set(t);return Array.from(e).sort(In)}function xf(r){let t=new Set;for(let n=0,i=r.length;n<i;n++){let s=r[n];for(let o in s){let c=s[o];c&&c.isTexture&&t.add(c)}}let e=Array.from(t);return jr(e).sort(In)}function yf(r){let t=[];return r.traverseVisible(e=>{(e.isRectAreaLight||e.isSpotLight||e.isPointLight||e.isDirectionalLight||e.isSunLight)&&t.push(e)}),t.sort(In)}import{DataTexture as Jr,FloatType as ts,NearestFilter as eo,RGBAFormat as io,RGFormat as es,RedFormat as ns}from"three";function Ji(r,t=Math.random){for(let e=r.length-1;e>0;e--){let n=~~((t()-1e-6)*e),i=r[e];r[e]=r[n],r[n]=i}}function to(r,t){r.fill(0);for(let e=0;e<t;e++)r[e]=1}var se=class{constructor(t){this.count=0,this.size=-1,this.sigma=-1,this.radius=-1,this.lookupTable=null,this.score=null,this.binaryPattern=null,this.resize(t),this.setSigma(1.5)}findVoid(){let{score:t,binaryPattern:e}=this,n=1/0,i=-1;for(let s=0,o=e.length;s<o;s++){if(e[s]!==0)continue;let c=t[s];c<n&&(n=c,i=s)}return i}findCluster(){let{score:t,binaryPattern:e}=this,n=-1/0,i=-1;for(let s=0,o=e.length;s<o;s++){if(e[s]!==1)continue;let c=t[s];c>n&&(n=c,i=s)}return i}setSigma(t){if(t===this.sigma)return;let e=~~(Math.sqrt(20*t**2)+1),n=2*e+1,i=new Float32Array(n*n),s=t*t;for(let o=-e;o<=e;o++)for(let c=-e;c<=e;c++){let f=(e+c)*n+o+e,p=o*o+c*c;i[f]=Math.E**(-p/(2*s))}this.lookupTable=i,this.sigma=t,this.radius=e}resize(t){this.size!==t&&(this.size=t,this.score=new Float32Array(t*t),this.binaryPattern=new Uint8Array(t*t))}invert(){let{binaryPattern:t,score:e,size:n}=this;e.fill(0);for(let i=0,s=t.length;i<s;i++)if(t[i]===0){let o=~~(i/n),c=i-o*n;this.updateScore(c,o,1),t[i]=1}else t[i]=0}updateScore(t,e,n){let{size:i,score:s,lookupTable:o}=this,c=this.radius,f=2*c+1;for(let p=-c;p<=c;p++)for(let u=-c;u<=c;u++){let a=(c+u)*f+p+c,l=o[a],d=t+p;d=d<0?i+d:d%i;let h=e+u;h=h<0?i+h:h%i;let w=h*i+d;s[w]+=n*l}}addPointIndex(t){this.binaryPattern[t]=1;let e=this.size,n=~~(t/e),i=t-n*e;this.updateScore(i,n,1),this.count++}removePointIndex(t){this.binaryPattern[t]=0;let e=this.size,n=~~(t/e),i=t-n*e;this.updateScore(i,n,-1),this.count--}copy(t){this.resize(t.size),this.score.set(t.score),this.binaryPattern.set(t.binaryPattern),this.setSigma(t.sigma),this.count=t.count}};var ke=class{constructor(){this.random=Math.random,this.sigma=1.5,this.size=64,this.majorityPointsRatio=.1,this.samples=new se(1),this.savedSamples=new se(1)}generate(){let{samples:t,savedSamples:e,sigma:n,majorityPointsRatio:i,size:s}=this;t.resize(s),t.setSigma(n);let o=Math.floor(s*s*i),c=t.binaryPattern;to(c,o),Ji(c,this.random);for(let a=0,l=c.length;a<l;a++)c[a]===1&&t.addPointIndex(a);for(;;){let a=t.findCluster();t.removePointIndex(a);let l=t.findVoid();if(a===l){t.addPointIndex(a);break}t.addPointIndex(l)}let f=new Uint32Array(s*s);e.copy(t);let p;for(p=t.count-1;p>=0;){let a=t.findCluster();t.removePointIndex(a),f[a]=p,p--}let u=s*s;for(p=e.count;p<u/2;){let a=e.findVoid();e.addPointIndex(a),f[a]=p,p++}for(e.invert();p<u;){let a=e.findCluster();e.removePointIndex(a),f[a]=p,p++}return{data:f,maxValue:u}}};function is(r){return r>=3?4:r}function os(r){switch(r){case 1:return ns;case 2:return es;default:return io}}var no=class extends Jr{constructor(t=64,e=1){super(new Float32Array(4),1,1,io,ts),this.minFilter=eo,this.magFilter=eo,this.size=t,this.channels=e,this.update()}update(){let t=this.channels,e=this.size,n=new ke;n.channels=t,n.size=e;let i=is(t),s=os(i);(this.image.width!==e||s!==this.format)&&(this.image.width=e,this.image.height=e,this.image.data=new Float32Array(e**2*i),this.format=s,this.dispose());let o=this.image.data;for(let c=0,f=t;c<f;c++){let p=n.generate(),u=p.data,a=p.maxValue;for(let l=0,d=u.length;l<d;l++){let h=u[l]/a;o[l*i+c]=h}}this.needsUpdate=!0}};var oo=`

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
`;import{DataTexture as rs,DataUtils as ss,EquirectangularReflectionMapping as cs,FloatType as as,HalfFloatType as ls,LinearFilter as fs,LinearMipMapLinearFilter as us,RGBAFormat as ps,RepeatWrapping as ro,ShaderMaterial as ds,WebGLRenderTarget as ms}from"three";import{FullScreenQuad as hs}from"three/examples/jsm/postprocessing/Pass.js";var Bn=class extends ds{constructor(){super({uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:`
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

				${oo}

				void main() {

					vec3 rayDirection = equirectUvToDirection( vUv );
					rayDirection.x *= flipEnvMap;
					gl_FragColor = textureCube( envMap, rayDirection );

				}`}),this.depthWrite=!1,this.depthTest=!1}},so=class{constructor(t){this._renderer=t,this._quad=new hs(new Bn)}generate(t,e=null,n=null){if(!t.isCubeTexture)throw new Error("CubeToEquirectMaterial: Source can only be cube textures.");let i=t.images[0],s=this._renderer,o=this._quad;e===null&&(e=4*i.height),n===null&&(n=2*i.height);let c=new ms(e,n,{type:as,colorSpace:i.colorSpace}),f=i.height,p=Math.log2(f)-2,u=1/f,a=1/(3*Math.max(Math.pow(2,p),112));o.material.defines.CUBEUV_MAX_MIP=`${p}.0`,o.material.defines.CUBEUV_TEXEL_WIDTH=a,o.material.defines.CUBEUV_TEXEL_HEIGHT=u,o.material.uniforms.envMap.value=t,o.material.uniforms.flipEnvMap.value=t.isRenderTargetTexture?1:-1,o.material.needsUpdate=!0;let l=s.getRenderTarget(),d=s.autoClear;s.autoClear=!0,s.setRenderTarget(c),o.render(s),s.setRenderTarget(l),s.autoClear=d;let h=new Uint16Array(e*n*4),w=new Float32Array(e*n*4);s.readRenderTargetPixels(c,0,0,e,n,w),c.dispose();for(let v=0,m=w.length;v<m;v++)h[v]=ss.toHalfFloat(w[v]);let g=new rs(h,e,n,ps,ls);return g.minFilter=us,g.magFilter=fs,g.wrapS=ro,g.wrapT=ro,g.mapping=cs,g.needsUpdate=!0,g}dispose(){this._quad.dispose()}};export{V as a,M as b,L as c,C as d,Ie as e,Be as f,zt as g,Si as h,Ri as i,ze as j,Ue as k,Hi as l,bn as m,nf as n,of as o,Xi as p,Fn as q,Yi as r,ji as s,$r as t,hf as u,xf as v,yf as w,no as x,oo as y,so as z,Dn as A};
